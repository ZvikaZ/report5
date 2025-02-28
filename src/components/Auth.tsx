//TODO make the photo smaller, and in the same line

import { useState, useEffect } from "react";
import { Dispatch, SetStateAction } from "react";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  Auth as FirebaseAuth,
  AuthError,
} from "firebase/auth";
import { app } from "../firebaseConfig.ts";
import { Button, Loader, Avatar, Text, Alert, Group } from "@mantine/core";
import { IconBrandGoogle, IconLogout } from "@tabler/icons-react";

const Auth = ({
  user,
  setUser,
}: {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const auth: FirebaseAuth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Sign in successful, photo URL:", result.user.photoURL);
    } catch (err) {
      console.error("Sign-in error:", err);
      setError(
        (err as AuthError).code === "auth/popup-blocked"
          ? "נא לאפשר חלונות קופצים בדפדפן"
          : "אירעה שגיאה בהתחברות. נא לנסות שוב",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out error:", err);
      setError("אירעה שגיאה בהתנתקות. נא לנסות שוב");
    } finally {
      setIsLoading(false);
    }
  };

  const getPhotoUrl = (url: string | null): string => {
    if (!url) return "";
    return url.split("?")[0];
  };

  return (
    <>
      {user ? (
        <Group>
          {user.photoURL && (
            <Avatar
              src={getPhotoUrl(user.photoURL)}
              alt={user.displayName || "Profile"}
              radius="xl"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                console.error("Image failed to load:", e);
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <Text>{user.displayName || user.email}</Text>
          <Button
            onClick={handleSignOut}
            disabled={isLoading}
            leftSection={
              isLoading ? <Loader size="xs" /> : <IconLogout size="1.5rem" />
            }
            variant="outline"
            color="red"
          >
            {isLoading ? "מתנתק..." : "התנתק"}
          </Button>
        </Group>
      ) : (
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          leftSection={
            isLoading ? <Loader size="xs" /> : <IconBrandGoogle size="1.5rem" />
          }
          variant="outline"
        >
          {isLoading ? "מתחבר..." : "הכנס עם חשבון גוגל"}
        </Button>
      )}

      {error && (
        <Alert
          title="שגיאה"
          color="red"
          style={{ width: "100%", textAlign: "right" }}
        >
          {error}
        </Alert>
      )}
    </>
  );
};

export default Auth;
