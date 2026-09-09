# Prestige Pro — guide d'installation

Application de gestion pour ton atelier (imprimerie & personnalisation),
installée sur **un seul ordinateur de la boutique** (le "serveur" — par
exemple le poste caisse). Les autres postes s'y connectent simplement
avec leur navigateur, via le réseau Wi-Fi/câblé de la boutique.

Aucune connexion internet n'est nécessaire une fois l'installation faite.
Toutes les données restent dans la boutique, dans le fichier
`data/db.json`.

---

## 1. Choisir le poste "serveur"

Choisis l'ordinateur qui reste allumé le plus souvent pendant les heures
d'ouverture (souvent le poste caisse). C'est lui qui va héberger
l'application ; les autres postes n'ont rien à installer, juste un
navigateur (Chrome, Firefox, Edge…).

## 2. Installer Node.js (une seule fois)

Sur le poste serveur :

1. Va sur **https://nodejs.org**
2. Télécharge la version "LTS" (recommandée)
3. Installe-la en cliquant "Suivant" partout (installation par défaut)

## 3. Installer l'application

1. Copie tout le dossier `atelier-app` sur le poste serveur (par exemple
   dans `Documents\atelier-app`)
2. Ouvre une invite de commandes dans ce dossier :
   - **Windows** : ouvre le dossier dans l'explorateur, puis dans la
     barre d'adresse en haut tape `cmd` et appuie sur Entrée
   - **Mac** : ouvre l'app "Terminal", tape `cd ` (avec l'espace) puis
     glisse le dossier `atelier-app` dedans, et appuie sur Entrée
3. Tape la commande suivante puis Entrée :
   ```
   npm install
   ```
   (à faire une seule fois — ça télécharge les quelques fichiers dont
   l'application a besoin pour fonctionner)

## 4. Démarrer l'application

**Windows** : double-clique sur `start.bat` dans le dossier.
**Mac** : double-clique sur `start.command` (la première fois, il
faudra peut-être faire clic droit → Ouvrir, à cause de la sécurité
Mac).

Ou, dans l'invite de commandes du dossier :
```
npm start
```

Tu verras s'afficher quelque chose comme :
```
=================================================
  Prestige Pro est démarré !

  Sur ce poste     : http://localhost:3000
  Autres postes    : http://192.168.1.24:3000

  Laisse cette fenêtre ouverte tant que la
  boutique utilise l'application.
=================================================
```

**Laisse cette fenêtre ouverte** — c'est elle qui fait tourner
l'application. Si tu la fermes, l'application s'arrête sur tous les
postes.

## 5. Créer le compte administrateur (première fois uniquement)

Ouvre ton navigateur et va à l'adresse `http://localhost:3000`

La toute première fois, l'application te demande de créer le compte
administrateur : ton nom, un identifiant, un mot de passe. C'est ce
compte qui pourra ensuite créer les comptes des autres employés
(Gestion → Employés).

## 6. Se connecter depuis les autres postes de la boutique

Assure-toi que l'ordinateur est connecté **au même réseau Wi-Fi ou
câblé** que le poste serveur. Ouvre un navigateur et tape l'adresse
"Autres postes" affichée à l'étape 4 (par exemple
`http://192.168.1.24:3000`). Chaque employé se connecte avec son
propre identifiant/mot de passe.

Astuce : note cette adresse sur un post-it près de chaque poste, elle
change rarement une fois le routeur configuré.

> Si la connexion ne marche pas depuis un autre poste, c'est
> généralement le pare-feu Windows qui bloque — la première fois que tu
> lances l'application, Windows demande "Autoriser l'accès ?" : clique
> **Autoriser** (réseaux privés).

## 7. Gérer les comptes employés

Une fois connecté en tant qu'administrateur : va dans **Employés** →
**Nouvel employé**. Coche "Donner un accès à l'application" pour créer
un identifiant/mot de passe pour cette personne. Coche "Administrateur"
uniquement pour les personnes qui doivent pouvoir gérer les autres
comptes.

Les employés sans connexion activée apparaissent quand même dans la
liste (pour le suivi de présence), mais ne peuvent pas se connecter à
l'application.

---

## Démarrage automatique (Windows)

Pour que le serveur démarre tout seul à chaque allumage du poste
serveur, sans avoir à double-cliquer chaque matin :

1. Fais un clic droit sur `start-silent.vbs` → **Créer un raccourci**
2. Appuie sur les touches **Windows + R**, tape `shell:startup`, puis
   Entrée (ça ouvre le dossier de démarrage de Windows)
3. Fais glisser le raccourci créé à l'étape 1 dans ce dossier

À partir de maintenant, le serveur démarre automatiquement (sans
fenêtre visible) à chaque ouverture de session sur ce poste. Si tu
préfères garder la fenêtre visible pour voir que ça tourne, utilise un
raccourci vers `start.bat` à la place.

## Démarrage automatique (Mac)

**Réglages système** → **Général** → **Ouverture** → bouton **+** →
sélectionne `start.command` dans le dossier `atelier-app`.

---

## Sauvegarde des données

Toutes les données sont dans `atelier-app/data/db.json`. Pense à copier
ce fichier de temps en temps sur une clé USB ou un cloud (Google Drive,
etc.) pour avoir une sauvegarde en cas de panne du poste serveur.

Le mot de passe de chaque compte est stocké de façon chiffrée
(haché) — même en ouvrant `db.json`, personne ne peut lire les mots de
passe en clair.

## Limites de cette version

- Les autres postes se synchronisent automatiquement toutes les
  6 secondes environ (pas en temps réel à la milliseconde près).
- Un seul niveau de permission au-delà de "administrateur" (tous les
  comptes non-admin ont accès aux mêmes fonctionnalités).
- Modules pas encore inclus : détail par type de produit (cartes de
  visite, flyers, personnalisation textile…), secrétariat, achats
  fournisseurs détaillés, statistiques avancées, export PDF/Excel,
  notifications.
