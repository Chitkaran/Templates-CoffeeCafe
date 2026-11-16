import {initializeApp} from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {EditableTextLayer} from './types';

export const ADMIN_EMAIL = 'chitkaran@gmail.com';
const SITE_CONFIG_COLLECTION = 'siteConfig';
const TEXT_LAYERS_DOC_ID = 'textLayers';
const TEXT_LAYERS_PATH = `${SITE_CONFIG_COLLECTION}/${TEXT_LAYERS_DOC_ID}`;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt: 'select_account'});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export function isAuthorizedAdmin(user: User | null): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
  );
}

export function sanitizeLayersForFirestore(
  layers: EditableTextLayer[],
): EditableTextLayer[] {
  return layers.slice(0, 20).map((layer, index) => {
    const cleanText = String(layer.text ?? '').slice(0, 1200);
    const cleanRanges = Array.isArray(layer.colorRanges)
      ? layer.colorRanges
          .slice(0, 40)
          .map((r) => ({
            start: Math.max(0, Math.min(cleanText.length, Math.round(Number(r?.start) || 0))),
            end: Math.max(0, Math.min(cleanText.length, Math.round(Number(r?.end) || 0))),
            color: String(r?.color || '#F5EFE6').slice(0, 32),
          }))
          .filter((r) => r.end > r.start)
      : [];

    return {
      id: String(layer.id || `layer-${index}`).slice(0, 64),
      label: String(layer.label || `Text ${index + 1}`).slice(0, 64),
      text: cleanText,
      x: Math.max(0, Math.min(100, Number(layer.x) || 0)),
      y: Math.max(0, Math.min(100, Number(layer.y) || 0)),
      fontSize: Math.max(12, Math.min(180, Math.round(Number(layer.fontSize) || 16))),
      isBold: Boolean(layer.isBold),
      lineHeight: Math.max(0.7, Math.min(2.5, Number(layer.lineHeight ?? 1.1))),
      letterSpacing: Math.max(-0.1, Math.min(0.5, Number(layer.letterSpacing ?? 0))),
      align: layer.align === 'left' || layer.align === 'right' ? layer.align : 'center',
      depth: layer.depth === 'behind' ? 'behind' : 'front',
      visibility:
        layer.visibility === 'hero' || layer.visibility === 'showcase'
          ? layer.visibility
          : 'always',
      fontStyle:
        layer.fontStyle === 'freeman' ||
        layer.fontStyle === 'sans' ||
        layer.fontStyle === 'italic'
          ? layer.fontStyle
          : 'display',
      color: String(layer.color || '#F5EFE6').slice(0, 32),
      colorRanges: cleanRanges,
      maxWidth: Math.max(100, Math.min(1200, Math.round(Number(layer.maxWidth) || 360))),
    };
  });
}

export function subscribeToTextLayers(
  onLayers: (layers: EditableTextLayer[] | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const ref = doc(db, SITE_CONFIG_COLLECTION, TEXT_LAYERS_DOC_ID);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onLayers(null);
        return;
      }
      const data = snapshot.data();
      if (Array.isArray(data?.layers) && data.layers.length > 0) {
        onLayers(sanitizeLayersForFirestore(data.layers as EditableTextLayer[]));
      } else {
        onLayers(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, TEXT_LAYERS_PATH);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function saveTextLayersToCloud(
  layers: EditableTextLayer[],
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sign in required to save text changes permanently.');
  }
  const sanitized = sanitizeLayersForFirestore(layers);
  if (sanitized.length === 0) {
    throw new Error('At least one text layer is required.');
  }
  const ref = doc(db, SITE_CONFIG_COLLECTION, TEXT_LAYERS_DOC_ID);
  try {
    await setDoc(ref, {
      layers: sanitized,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, TEXT_LAYERS_PATH);
  }
}

export async function signInEditorWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutEditor(): Promise<void> {
  await signOut(auth);
}
