# Straight Edge Barbershop Firebase Setup (Step-by-Step)

This project stores profile-style data in the **`clients`** Firestore collection. The new profile should use document id:

- `straightedgebarbershop`

## 1) Confirm Authentication

1. Open Firebase Console → **Build** → **Authentication** → **Sign-in method**.
2. This site currently signs in from `login.html` with email + password (`signInWithEmailAndPassword`), so enable **Email/Password**.
3. Make sure your production domain(s) are in Authentication → Settings → Authorized domains.

## 2) Confirm Firestore is enabled

1. Open Firebase Console → **Build** → **Firestore Database**.
2. If Firestore is not created yet, click **Create database**.
3. Use **production mode**.
4. Choose a region close to your users.

## 3) Create the Straight Edge profile document

Collection name:
- `clients`

Document id:
- `straightedgebarbershop`

Suggested fields (matches current portal schema + safe extras):

```json
{
  "businessName": "The Straight Edge Barbershop",
  "name": "The Straight Edge Barbershop",
  "username": "straightedgebarbershop",
  "slug": "straightedgebarbershop",
  "email": "owner@straightedgebarbershop.com",
  "website": "https://straightedgebarbershop.com",
  "photoUrl": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80",
  "bio": "Modern barbershop focused on clean fades, beard shaping, and classic cuts.",
  "location": {
    "city": "Tahlequah",
    "state": "OK"
  },
  "category": "(must be an existing category value already used by another client)",
  "categories": [
    "(same category value as above)"
  ],
  "tags": ["barbershop", "mens grooming", "local business"],
  "plan": "Standard Support",
  "lastUpdate": "MM/DD/YYYY",
  "notes": "Profile seeded automatically. Update any placeholder values.",
  "isPublished": true,
  "status": "active",
  "lastUpdatedAt": "server timestamp",
  "dailyStats": {
    "profileViews": 0,
    "supportRequests": 0,
    "updatedBy": "seed-script"
  }
}
```

## 4) Firestore Security Rules (safe read + admin writes)

Use this pattern to allow public read-only access for published profiles and restrict writes.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clients/{clientId} {
      allow read: if resource.data.isPublished == true;
      allow write: if request.auth != null
        && request.auth.token.admin == true;
    }
  }
}
```

If only Cloud Functions should write, keep client writes blocked and let Admin SDK write from backend.

## 5) Indexes (only if needed by your future queries)

If you query profiles with multiple filters, create indexes in Firestore → Indexes.

Common ones:
- `clients` with `username` ascending (for `.where("username", "==", "...")`)
- `clients` with `category` ascending + `isPublished` ascending (for category pages)
- `clients` with `isPublished` ascending + `status` ascending (for active published lists)

Firestore gives a direct “Create index” link in error messages if one is missing.

## 6) One-time seed script (terminal)

The script reads current categories from existing `clients` docs, then writes Straight Edge without inventing new category lists.

```bash
export FIREBASE_SERVICE_ACCOUNT=/absolute/path/to/service-account.json
npm run seed:straight-edge
```

## 7) Daily auto-update deployment (Cloud Functions + Scheduler)

1. Install Firebase CLI (one-time):
   ```bash
   npm install -g firebase-tools
   ```
2. Login to Firebase:
   ```bash
   firebase login
   ```
3. Select project in repo root:
   ```bash
   firebase use YOUR_PROJECT_ID
   ```
4. Install function dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```
5. Deploy scheduled function:
   ```bash
   firebase deploy --only functions:updateStraightEdgeProfileDaily
   ```

After deploy, Cloud Scheduler runs daily at **3:00 AM America/Chicago**.
The function updates `clients/straightedgebarbershop` with server-side fields (`lastUpdatedAt`, `dailyStats`, derived categories).
