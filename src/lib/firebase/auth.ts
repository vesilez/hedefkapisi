import "client-only";

import { getAuth } from "firebase/auth";
import { firebaseApp } from "./client";

export const auth = getAuth(firebaseApp);
