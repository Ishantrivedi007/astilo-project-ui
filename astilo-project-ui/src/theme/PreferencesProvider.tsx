import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BACKGROUND_STORAGE_KEY,
  CUSTOM_IMAGE_STORAGE_KEY,
  DEFAULT_BACKGROUND_STYLE,
  DEFAULT_LOADER_STYLE,
  LOADER_STORAGE_KEY,
  type BackgroundStyleId,
  type LoaderStyleId,
} from "./preferences";

interface PreferencesContextValue {
  backgroundStyle: BackgroundStyleId;
  setBackgroundStyle: (id: BackgroundStyleId) => void;
  loaderStyle: LoaderStyleId;
  setLoaderStyle: (id: LoaderStyleId) => void;
  /** Data URL of the user's uploaded background image, or null if none is set. */
  customImage: string | null;
  setCustomImage: (dataUrl: string | null) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const readStored = <T extends string>(key: string, fallback: T): T => {
  try {
    return (localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
};

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyleId>(() =>
    readStored(BACKGROUND_STORAGE_KEY, DEFAULT_BACKGROUND_STYLE)
  );
  const [loaderStyle, setLoaderStyleState] = useState<LoaderStyleId>(() =>
    readStored(LOADER_STORAGE_KEY, DEFAULT_LOADER_STYLE)
  );
  const [customImage, setCustomImageState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CUSTOM_IMAGE_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setBackgroundStyle = useCallback((id: BackgroundStyleId) => {
    setBackgroundStyleState(id);
    try {
      localStorage.setItem(BACKGROUND_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const setLoaderStyle = useCallback((id: LoaderStyleId) => {
    setLoaderStyleState(id);
    try {
      localStorage.setItem(LOADER_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const setCustomImage = useCallback((dataUrl: string | null) => {
    setCustomImageState(dataUrl);
    try {
      if (dataUrl) localStorage.setItem(CUSTOM_IMAGE_STORAGE_KEY, dataUrl);
      else localStorage.removeItem(CUSTOM_IMAGE_STORAGE_KEY);
    } catch {
      /* image too large for localStorage quota — keep it in-memory for this session */
    }
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      backgroundStyle,
      setBackgroundStyle,
      loaderStyle,
      setLoaderStyle,
      customImage,
      setCustomImage,
    }),
    [backgroundStyle, setBackgroundStyle, loaderStyle, setLoaderStyle, customImage, setCustomImage]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
};
