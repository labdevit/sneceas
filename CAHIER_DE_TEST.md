# Cahier de Test — Plateforme S.N.E.C.E.A

**Version :** 1.0  
**Date :** 18 mars 2026  
**Projet :** S.N.E.C.E.A — Système de gestion des requêtes syndicales  
**Environnement :** Application Web React / Django REST Framework  

---

## Table des matières

1. [Authentification](#1-authentification)
2. [Inscription](#2-inscription)
3. [Tableau de bord](#3-tableau-de-bord)
4. [Soumission de requête](#4-soumission-de-requête)
5. [Liste des requêtes](#5-liste-des-requêtes)
6. [Détail d'une requête](#6-détail-dune-requête)
7. [Activités (Interactions RH)](#7-activités-interactions-rh)
8. [Calendrier des activités](#8-calendrier-des-activités)
9. [Communication & Diffusion](#9-communication--diffusion)
10. [Notation des entreprises](#10-notation-des-entreprises)
11. [Annuaire des délégués](#11-annuaire-des-délégués)
12. [Gestion des pôles](#12-gestion-des-pôles)
13. [Documents](#13-documents)
14. [Rapports & Statistiques](#14-rapports--statistiques)
15. [Paramètres](#15-paramètres)
16. [Administration](#16-administration)
17. [Navigation & Composants transverses](#17-navigation--composants-transverses)
18. [Matrice des rôles (ACL)](#18-matrice-des-rôles-acl)

---

## 1. Authentification

**Page :** `/login`

### CT-AUTH-01 — Connexion avec identifiants valides
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Compte utilisateur existant |
| **Étapes** | 1. Accéder à `/login` 2. Saisir email valide 3. Saisir mot de passe valide 4. Cliquer "Se connecter" |
| **Résultat attendu** | Toast de succès avec rôle affiché. Redirection vers `/` (ou page précédente). Token stocké en localStorage. |
| **Statut** | ☐ |

### CT-AUTH-02 — Connexion avec identifiants invalides
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir email/mot de passe incorrects 2. Cliquer "Se connecter" |
| **Résultat attendu** | Toast destructif : "Échec de connexion — Identifiants incorrects." Aucune redirection. |
| **Statut** | ☐ |

### CT-AUTH-03 — Bascule visibilité mot de passe
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer l'icône œil à droite du champ mot de passe |
| **Résultat attendu** | Le champ passe de `type="password"` à `type="text"` et vice versa. L'icône bascule entre Eye et EyeOff. |
| **Statut** | ☐ |

### CT-AUTH-04 — État de chargement pendant la connexion
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Soumettre le formulaire de connexion |
| **Résultat attendu** | Bouton désactivé avec texte "Connexion..." |
| **Statut** | ☐ |

### CT-AUTH-05 — Liens de navigation
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Créer un compte" 2. Cliquer "Mot de passe oublié ?" |
| **Résultat attendu** | Redirection vers `/register` et `/forgot-password` respectivement. |
| **Statut** | ☐ |

### CT-AUTH-06 — Déconnexion
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Être connecté |
| **Étapes** | 1. Cliquer le menu utilisateur en haut à droite 2. Cliquer "Déconnexion" |
| **Résultat attendu** | Token supprimé de localStorage. Redirection vers `/login`. |
| **Statut** | ☐ |

---

## 2. Inscription

**Page :** `/register`

### CT-REG-01 — Inscription avec données valides
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Remplir : Prénom, Nom, Compagnie, Email, Mot de passe (≥ 8 car.), Confirmation 2. Cliquer "Créer mon compte" |
| **Résultat attendu** | Toast de succès. Redirection vers `/login`. |
| **Statut** | ☐ |

### CT-REG-02 — Validation mot de passe court (< 8 caractères)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un mot de passe de moins de 8 caractères |
| **Résultat attendu** | Indication "Minimum 8 caractères" affichée. Bouton désactivé. |
| **Statut** | ☐ |

### CT-REG-03 — Mots de passe non concordants
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un mot de passe 2. Saisir une confirmation différente 3. Soumettre |
| **Résultat attendu** | Toast destructif : "Les mots de passe ne correspondent pas." |
| **Statut** | ☐ |

### CT-REG-04 — Champs obligatoires manquants
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Laisser un champ obligatoire vide (Prénom, Nom, Compagnie, Email, MDP) |
| **Résultat attendu** | Bouton "Créer mon compte" reste désactivé. |
| **Statut** | ☐ |

### CT-REG-05 — Chargement des compagnies
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Ouvrir la page d'inscription |
| **Résultat attendu** | Le dropdown "Compagnie" est rempli depuis l'API `/companies/`. |
| **Statut** | ☐ |

### CT-REG-06 — Erreur serveur (email déjà pris)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. S'inscrire avec un email existant |
| **Résultat attendu** | Toast destructif avec le message d'erreur du serveur. |
| **Statut** | ☐ |

---

## 3. Tableau de bord

**Page :** `/`

### CT-DASH-01 — Affichage du message d'accueil
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Être connecté |
| **Résultat attendu** | "Bonjour, {nom} 👋" affiché avec le rôle de l'utilisateur. |
| **Statut** | ☐ |

### CT-DASH-02 — Cartes de statistiques
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | 4 cartes affichées : "Requêtes en cours", "Requêtes clôturées", "Total requêtes", "En attente d'infos". Les chiffres correspondent aux données de l'API. |
| **Statut** | ☐ |

### CT-DASH-03 — Actions rapides
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer chaque bouton d'action rapide |
| **Résultat attendu** | Navigation correcte vers les pages correspondantes. |
| **Statut** | ☐ |

### CT-DASH-04 — Dernières requêtes
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Les 5 dernières requêtes triées par date de mise à jour s'affichent. |
| **Statut** | ☐ |

### CT-DASH-05 — État de chargement
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Spinner affiché pendant le chargement des données. |
| **Statut** | ☐ |

---

## 4. Soumission de requête

**Page :** `/submit`

### CT-SUB-01 — Navigation entre étapes (wizard 3 étapes)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Remplir étape 1 → "Suivant" 2. Remplir étape 2 → "Suivant" 3. Retour |
| **Résultat attendu** | Navigation fluide entre les 3 étapes. Boutons "Retour" et "Suivant" fonctionnels. "Retour" désactivé à l'étape 1. |
| **Statut** | ☐ |

### CT-SUB-02 — Étape 1 : Identification — Données utilisateur
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Nom et email pré-remplis et non modifiables. |
| **Statut** | ☐ |

### CT-SUB-03 — Étape 1 : Sélection de la compagnie
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Ouvrir le dropdown compagnie 2. Sélectionner une compagnie |
| **Résultat attendu** | Liste des compagnies chargée depuis l'API. Bouton "Suivant" activé après sélection. |
| **Statut** | ☐ |

### CT-SUB-04 — Étape 1 : Soumission pour un autre utilisateur
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Avoir le droit `submit_for_others` (admin, délégué, etc.) |
| **Étapes** | 1. Rechercher un utilisateur par nom/username/matricule 2. Sélectionner un profil |
| **Résultat attendu** | Le champ "Pour le compte de" apparaît. La compagnie de l'utilisateur sélectionné se charge automatiquement (via le profil délégué). |
| **Statut** | ☐ |

### CT-SUB-05 — Étape 1 : Auto-chargement compagnie à la sélection d'un agent
| Élément | Détail |
|---------|--------|
| **Pré-requis** | L'agent sélectionné a un profil délégué avec une compagnie |
| **Étapes** | 1. Sélectionner un agent dans le dropdown |
| **Résultat attendu** | Le champ Compagnie se met à jour automatiquement avec la compagnie du délégué. |
| **Statut** | ☐ |

### CT-SUB-06 — Étape 2 : Sélection du pôle (type de requête)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur un pôle dans la grille |
| **Résultat attendu** | Le pôle s'affiche en surbrillance (bordure bleue). Le tooltip au survol montre la description du pôle. |
| **Statut** | ☐ |

### CT-SUB-07 — Étape 2 : Sélection de l'urgence
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur un niveau d'urgence (Faible, Moyenne, Élevée, Critique) |
| **Résultat attendu** | Le niveau sélectionné est entouré de la couleur correspondante. Légende explicative affichée en dessous. |
| **Statut** | ☐ |

### CT-SUB-08 — Étape 3 : Validation objet (min 5 caractères)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir moins de 5 caractères dans "Objet" |
| **Résultat attendu** | Bouton "Envoyer" reste désactivé. Indication "Minimum 5 caractères" visible. |
| **Statut** | ☐ |

### CT-SUB-09 — Étape 3 : Validation description (min 20 caractères)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir moins de 20 caractères dans "Description" |
| **Résultat attendu** | Compteur affiche "{n}/20 caractères minimum". Bouton désactivé tant que < 20. |
| **Statut** | ☐ |

### CT-SUB-10 — Étape 3 : Ajout et suppression de pièces jointes
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer la zone d'upload 2. Sélectionner un fichier (.pdf, .jpg, .png) 3. Cliquer X pour supprimer |
| **Résultat attendu** | Fichier ajouté à la liste. Nom affiché. Le bouton X le supprime. |
| **Statut** | ☐ |

### CT-SUB-11 — Envoi de la requête
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Compléter les 3 étapes 2. Cliquer "Envoyer la requête" |
| **Résultat attendu** | Toast de succès avec référence du ticket. Redirection vers `/tickets`. |
| **Statut** | ☐ |

### CT-SUB-12 — Erreur 404/500 à l'envoi
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Soumettre avec des données incomplètes côté serveur |
| **Résultat attendu** | Toast destructif : "Impossible de soumettre la requête." avec message d'erreur. |
| **Statut** | ☐ |

---

## 5. Liste des requêtes

**Page :** `/tickets`

### CT-TIC-01 — Affichage de la liste des requêtes
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Tableau avec colonnes : Référence, Type, Pôle, Entreprise, Demandeur, Urgence, Statut, Mise à jour, Action. |
| **Statut** | ☐ |

### CT-TIC-02 — Recherche par référence ou objet
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un terme dans la barre de recherche (debounce 300ms) |
| **Résultat attendu** | Liste filtrée en temps réel. Compteur mis à jour. |
| **Statut** | ☐ |

### CT-TIC-03 — Filtre par statut
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Sélectionner un statut dans le dropdown |
| **Résultat attendu** | Seules les requêtes avec ce statut sont affichées. |
| **Statut** | ☐ |

### CT-TIC-04 — Filtre par urgence
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Sélectionner un niveau d'urgence |
| **Résultat attendu** | Seules les requêtes avec cette urgence sont affichées. |
| **Statut** | ☐ |

### CT-TIC-05 — Navigation vers le détail
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Voir" sur une requête |
| **Résultat attendu** | Redirection vers `/tickets/{id}`. |
| **Statut** | ☐ |

### CT-TIC-06 — Bouton "Nouvelle requête"
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Nouvelle requête" |
| **Résultat attendu** | Redirection vers `/submit`. |
| **Statut** | ☐ |

### CT-TIC-07 — Liste vide
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Message "Aucune requête trouvée" affiché. |
| **Statut** | ☐ |

---

## 6. Détail d'une requête

**Page :** `/tickets/:id`

### CT-DET-01 — Affichage des informations du ticket
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Référence (mono), titre, description, badges urgence + statut, type de requête. |
| **Statut** | ☐ |

### CT-DET-02 — Timeline de progression
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Étapes affichées : Nouveau → En traitement → Escaladé → Résolu → Clôturé. Étape active mise en surbrillance. Étapes passées en vert. Labels lisibles (pas de numéros). |
| **Statut** | ☐ |

### CT-DET-03 — Classification du ticket (rôle classifieur)
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Avoir le droit `ticket_classify` |
| **Étapes** | 1. Sélectionner type de requête 2. Sélectionner urgence 3. Sélectionner pôle 4. Sélectionner délégué 5. Cliquer "Enregistrer la classification" |
| **Résultat attendu** | Toast de succès. Ticket mis à jour. Badge "À classifier" disparaît. |
| **Statut** | ☐ |

### CT-DET-04 — Changement de statut
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Avoir le droit `ticket_classify` |
| **Étapes** | 1. Sélectionner un nouveau statut dans le dropdown 2. Confirmation |
| **Résultat attendu** | Statut mis à jour. Timeline de progression reflète le changement. Notification envoyée. |
| **Statut** | ☐ |

### CT-DET-05 — Suivi des activités (ActivityTracker)
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Section "Suivi des activités" avec badge de comptage. Liste des 3 premières activités + bouton "Voir tout". |
| **Statut** | ☐ |

### CT-DET-06 — Ajout d'une activité depuis le ticket
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Droit de gestion des activités |
| **Étapes** | 1. Cliquer "+" 2. Remplir le formulaire (type, résumé, date, canal, contact) 3. Remplir les champs dynamiques selon le modèle 4. Soumettre |
| **Résultat attendu** | Activité créée, liée au ticket. Apparaît dans la liste. Champs dynamiques sauvegardés dans `extra_data`. |
| **Statut** | ☐ |

### CT-DET-07 — Détail d'une activité avec champs dynamiques
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur une activité dans la liste |
| **Résultat attendu** | Popup de détail affichant : résumé, date, canal, statut, badge type d'activité, et section "Champs du modèle" avec les labels et valeurs des champs dynamiques. |
| **Statut** | ☐ |

### CT-DET-08 — Marquer une activité comme terminée
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer ✓ sur une activité "Planifiée" |
| **Résultat attendu** | Dialog de complétion avec commentaire obligatoire. L'activité passe en statut "Terminée". |
| **Statut** | ☐ |

### CT-DET-09 — Annuler une activité
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer ✕ sur une activité "Planifiée" |
| **Résultat attendu** | L'activité passe en statut "Annulée". |
| **Statut** | ☐ |

### CT-DET-10 — Pièces jointes du ticket
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Section "Pièces jointes" avec badge de comptage. 3 premiers documents visibles + bouton "Voir tout". Chaque document a : nom, type, date, boutons Aperçu/Télécharger/Partager. |
| **Statut** | ☐ |

### CT-DET-11 — Ajout d'une pièce jointe
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Ajouter une pièce jointe" 2. Remplir nom et type 3. Uploader un fichier 4. Cliquer "Ajouter" |
| **Résultat attendu** | Document ajouté à la liste. Toast de succès. |
| **Statut** | ☐ |

### CT-DET-12 — Suppression d'une pièce jointe (super admin)
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Rôle super_admin |
| **Étapes** | 1. Cliquer l'icône corbeille rouge sur un document |
| **Résultat attendu** | Confirmation requise. Document supprimé. |
| **Statut** | ☐ |

### CT-DET-13 — Historique d'audit
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Section "Historique" avec badge de comptage. Chaque entrée affiche : utilisateur, timestamp, action (création, mise à jour, changement de statut), et détail des changements. |
| **Statut** | ☐ |

### CT-DET-14 — Compte-rendu de clôture (statut terminal)
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Ticket en statut terminal (is_terminal = true) |
| **Résultat attendu** | Éditeur WYSIWYG (TipTap) avec barre d'outils (Gras, Italique, Souligné, Listes, Alignement). Boutons "Enregistrer", "PDF", "Template". Badge "Enregistré" si rapport existant. |
| **Statut** | ☐ |

### CT-DET-15 — Génération PDF du compte-rendu
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Rédiger un compte-rendu 2. Cliquer "PDF" |
| **Résultat attendu** | Téléchargement d'un fichier PDF nommé "CR-{référence}.pdf". |
| **Statut** | ☐ |

### CT-DET-16 — Chargement d'un template de compte-rendu
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Template" |
| **Résultat attendu** | Le contenu du template pré-rempli avec les variables du ticket (référence, objet, entreprise, etc.) est chargé dans l'éditeur. |
| **Statut** | ☐ |

### CT-DET-17 — Retour à la liste
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Retour aux requêtes" |
| **Résultat attendu** | Redirection vers `/tickets`. |
| **Statut** | ☐ |

---

## 7. Activités (Interactions RH)

**Page :** `/activities` et `/activities/:typeCode`

### CT-ACT-01 — Affichage des modèles d'activité
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Grille de cartes des modèles d'activité (par ex. "Appel", "Réunion", "Email"). Chaque carte montre : label, pôle principal, canal par défaut. |
| **Statut** | ☐ |

### CT-ACT-02 — Navigation vers un type d'activité
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur un modèle d'activité |
| **Résultat attendu** | Redirection vers `/activities/{typeCode}`. Titre de la page mis à jour avec le nom du modèle. Tableau filtré par ce type. |
| **Statut** | ☐ |

### CT-ACT-03 — Tableau des activités
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Colonnes : Résumé, Statut, Canal, Type, Requête, Pôle, Date prévue, Contact, Actions. Badges colorés pour le statut. |
| **Statut** | ☐ |

### CT-ACT-04 — Filtres des activités
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Tester la recherche (debounce 300ms) 2. Filtrer par propriétaire (Mes activités / Toutes) 3. Filtrer par statut 4. Filtrer par pôle |
| **Résultat attendu** | Tableau se met à jour en temps réel selon les filtres. |
| **Statut** | ☐ |

### CT-ACT-05 — Création d'une activité
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Nouvelle activité" 2. Remplir : type d'activité, résumé, date, canal, contact, statut 3. Optionnel : lier un ticket (recherche), pièce jointe 4. Remplir les champs dynamiques du modèle 5. Cliquer "Créer" |
| **Résultat attendu** | Activité créée. Toast de succès. Apparaît dans le tableau. |
| **Statut** | ☐ |

### CT-ACT-06 — Création d'une activité sans liaison ticket
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Créer une activité en choisissant "Aucune (activité hors ticket)" |
| **Résultat attendu** | Activité créée sans ticket lié. Colonne "Requête" affiche "—". |
| **Statut** | ☐ |

### CT-ACT-07 — Champs dynamiques selon le modèle d'activité
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Sélectionner un type d'activité ayant des champs configurés 2. Vérifier que les champs apparaissent dynamiquement |
| **Résultat attendu** | Champs supplémentaires (text, textarea, number, date, datetime) affichés selon `fields_config`. Champs obligatoires marqués avec *. Triés par `order`. |
| **Statut** | ☐ |

### CT-ACT-08 — Modification d'une activité
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer le crayon sur une activité 2. Modifier les champs 3. Cliquer "Mettre à jour" |
| **Résultat attendu** | Activité mise à jour. Toast de succès. |
| **Statut** | ☐ |

### CT-ACT-09 — Suppression d'une activité
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer la corbeille 2. Confirmer la suppression |
| **Résultat attendu** | Activité supprimée du tableau. |
| **Statut** | ☐ |

### CT-ACT-10 — Marquer une activité comme "Terminée"
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Activité en statut "Planifiée" |
| **Étapes** | 1. Cliquer l'icône ✓ |
| **Résultat attendu** | Statut passe à "done". Badge mis à jour. |
| **Statut** | ☐ |

### CT-ACT-11 — Détail d'une activité (dialog)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer l'icône œil sur une activité |
| **Résultat attendu** | Dialog complet affichant : résumé, notes, date, canal, contact, statut, résultat/compte-rendu, pièce jointe, ticket lié, et section "Champs du modèle" avec les champs dynamiques résolus (labels au lieu des codes). |
| **Statut** | ☐ |

---

## 8. Calendrier des activités

**Page :** `/calendar`

### CT-CAL-01 — Affichage du calendrier mensuel
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Grille calendrier 7 colonnes × 6 lignes. Mois/année en titre. Boutons mois précédent/suivant et "Aujourd'hui". Jours non courants en gris. |
| **Statut** | ☐ |

### CT-CAL-02 — Activités sur le calendrier
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Chaque jour affiche jusqu'à 2 badges d'activités + texte "+X" si plus. Code couleur par statut (bleu=planifié, vert=terminé, gris=annulé). |
| **Statut** | ☐ |

### CT-CAL-03 — Cartes de statistiques
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | 3 cartes : Planifiées (compte), Terminées (compte), Cette semaine (compte). |
| **Statut** | ☐ |

### CT-CAL-04 — Filtres du calendrier
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Filtrer par type (appel, réunion, email, document, note) 2. Filtrer par statut (planifié, terminé, annulé) 3. Filtrer par ticket 4. Supprimer un filtre (badge cliquable) |
| **Résultat attendu** | Calendrier mis à jour dynamiquement. Filtres actifs affichés comme badges amovibles. |
| **Statut** | ☐ |

### CT-CAL-05 — Détail d'un jour
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur un jour ayant des activités |
| **Résultat attendu** | Dialog affichant toutes les activités du jour avec : icône type, titre, statut, description. |
| **Statut** | ☐ |

### CT-CAL-06 — Navigation entre mois
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer flèche gauche/droite 2. Cliquer "Aujourd'hui" |
| **Résultat attendu** | Le calendrier se met à jour sur le mois ciblé. "Aujourd'hui" revient au mois courant avec surbrillance du jour actuel. |
| **Statut** | ☐ |

---

## 9. Communication & Diffusion

**Page :** `/communication`

### CT-COM-01 — Onglet Notifications — Affichage
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Liste paginée (20/page) des notifications. Chaque notification montre : icône, titre (gras si non lue), message, date, badge "Nouveau" si non lue. |
| **Statut** | ☐ |

### CT-COM-02 — Notifications — Recherche
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un terme dans "Rechercher une notification..." |
| **Résultat attendu** | Liste filtrée par titre ou message. Compteur mis à jour. |
| **Statut** | ☐ |

### CT-COM-03 — Notifications — Pagination
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Suivant" / "Précédent" |
| **Résultat attendu** | Navigation entre les pages. Indicateur "page X / Y" mis à jour. Bouton "Précédent" désactivé en page 1. "Suivant" désactivé en dernière page. |
| **Statut** | ☐ |

### CT-COM-04 — Clic notification → Redirection vers l'objet
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Voir le détail" sur une notification ayant un lien |
| **Résultat attendu** | Notification marquée comme lue. Redirection vers l'objet (ex: `/tickets/{id}`). |
| **Statut** | ☐ |

### CT-COM-05 — Onglet Diffusions — Historique
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Liste paginée (20/page) des diffusions. Chaque diffusion montre : icône canal (email/WhatsApp), objet, audience, date, nombre de destinataires, badge statut (Brouillon, En cours, Envoyé, Échec). |
| **Statut** | ☐ |

### CT-COM-06 — Diffusions — Pagination
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Naviguer entre les pages |
| **Résultat attendu** | Contrôles "Précédent / Suivant" fonctionnels. "Page X sur Y — N diffusions". |
| **Statut** | ☐ |

### CT-COM-07 — Création d'une diffusion email
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Nouvelle diffusion" 2. Sélectionner canal "Email" 3. Saisir l'objet 4. Sélectionner l'audience (Tous / Pôles / Compagnies) 5. Rédiger le contenu dans l'éditeur WYSIWYG 6. Optionnel : ajouter des pièces jointes 7. Prévisualiser 8. Envoyer |
| **Résultat attendu** | Diffusion créée et envoyée. Toast de succès. Apparaît dans l'historique avec statut "Envoyé". |
| **Statut** | ☐ |

### CT-COM-08 — Création d'une diffusion WhatsApp
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Sélectionner canal "WhatsApp" 2. Rédiger le message texte 3. Envoyer |
| **Résultat attendu** | Message envoyé en mode texte simple (pas de WYSIWYG complet). Pas de pièces jointes. |
| **Statut** | ☐ |

### CT-COM-09 — Prévisualisation d'une diffusion
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Prévisualiser" dans le compositeur |
| **Résultat attendu** | Aperçu formaté du message affiché dans un dialog. |
| **Statut** | ☐ |

---

## 10. Notation des entreprises

**Page :** `/company-ratings`

### CT-NOT-01 — Affichage de la légende des critères
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Carte avec 2 sections : "Évaluation des entreprises" (4 critères) et "Formation & bien-être" (3 critères). Chaque critère avec icône étoile et label. |
| **Statut** | ☐ |

### CT-NOT-02 — Grille des entreprises avec moyennes
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Carte par entreprise montrant : nom, badge "{n} note(s)", moyenne globale "{x}/5" ou "—", top 3 critères avec moyennes, indication "+ {n} autre(s) critère(s)". |
| **Statut** | ☐ |

### CT-NOT-03 — Notation d'une entreprise
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Noter cette entreprise" 2. Attribuer des étoiles (1 à 5) pour chaque critère 3. Optionnel : ajouter un commentaire 4. Cliquer "Enregistrer les notes" |
| **Résultat attendu** | Toast "Notes enregistrées". Moyennes recalculées. Dialog se ferme. |
| **Statut** | ☐ |

### CT-NOT-04 — Upsert (mise à jour d'une notation existante)
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Avoir déjà noté une entreprise |
| **Étapes** | 1. Rouvrir la notation de cette entreprise |
| **Résultat attendu** | Les notes et commentaires précédents sont pré-remplis. La soumission met à jour les valeurs existantes (pas de doublon). |
| **Statut** | ☐ |

### CT-NOT-05 — Widget étoiles interactif
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur la 3ème étoile 2. Cliquer sur la 1ère étoile |
| **Résultat attendu** | Étoiles remplies en ambré jusqu'à la valeur cliquée. Hover avec effet de zoom. |
| **Statut** | ☐ |

### CT-NOT-06 — Tableau de détail des notations
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Au moins une notation existante |
| **Résultat attendu** | Tableau avec colonnes : Entreprise, Critère, Note (étoiles en lecture seule), Commentaire, Par. Trié par entreprise puis critère. |
| **Statut** | ☐ |

---

## 11. Annuaire des délégués

**Page :** `/delegates`

### CT-DEL-01 — Affichage de l'annuaire
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Grille de cartes (1/2/3 colonnes responsives) pour chaque délégué actif. Chaque carte : avatar (initiales), nom, compagnie, badge "Délégué syndical", téléphone, email. |
| **Statut** | ☐ |

### CT-DEL-02 — Recherche de délégué
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un nom dans le champ de recherche |
| **Résultat attendu** | Filtrage en temps réel par username. |
| **Statut** | ☐ |

### CT-DEL-03 — Filtre par compagnie
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Sélectionner une compagnie dans le dropdown |
| **Résultat attendu** | Seuls les délégués de cette compagnie sont affichés. |
| **Statut** | ☐ |

### CT-DEL-04 — Actions de contact
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Appeler" 2. Cliquer "Email" |
| **Résultat attendu** | "Appeler" ouvre `tel:{numéro}`. "Email" ouvre `mailto:{email}`. |
| **Statut** | ☐ |

### CT-DEL-05 — Compteur de résultats
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Message "{n} délégué(s) trouvé(s)" en bas de page. |
| **Statut** | ☐ |

---

## 12. Gestion des pôles

**Page :** `/poles`

### CT-POL-01 — Liste des pôles
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Colonne gauche : liste cliquable des pôles avec badge de comptage. Chaque pôle montre : nom + description (tronquée). |
| **Statut** | ☐ |

### CT-POL-02 — Détail d'un pôle
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur un pôle |
| **Résultat attendu** | Colonne droite : nom, description, section "Membres" avec badge de comptage. Chaque membre montre : nom, fonction ("Chef de pôle" ou "Assistant"). |
| **Statut** | ☐ |

### CT-POL-03 — Ajout d'un membre au pôle
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Ajouter un membre" 2. Sélectionner un utilisateur (filtrés aux non-membres) 3. Cliquer "Ajouter" |
| **Résultat attendu** | Membre ajouté à la liste. Dialog se ferme. |
| **Statut** | ☐ |

### CT-POL-04 — Suppression d'un membre
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer l'icône corbeille rouge sur un membre |
| **Résultat attendu** | Confirmation requise. Membre retiré de la liste. |
| **Statut** | ☐ |

---

## 13. Documents

**Page :** `/documents`

### CT-DOC-01 — Affichage des documents par catégorie
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Documents groupés par catégorie (template_name). Sections dépliables avec compteur. |
| **Statut** | ☐ |

### CT-DOC-02 — Recherche de documents
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un terme dans la recherche (debounce 300ms) |
| **Résultat attendu** | Documents filtrés en temps réel. |
| **Statut** | ☐ |

### CT-DOC-03 — Filtre par année
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Sélectionner une année dans le dropdown |
| **Résultat attendu** | Seuls les documents de cette année sont affichés. |
| **Statut** | ☐ |

### CT-DOC-04 — Aperçu d'un document
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer l'icône œil |
| **Résultat attendu** | Dialog de prévisualisation du document. |
| **Statut** | ☐ |

### CT-DOC-05 — Téléchargement d'un document
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer l'icône téléchargement |
| **Résultat attendu** | Fichier téléchargé avec header d'authentification. |
| **Statut** | ☐ |

### CT-DOC-06 — Partage d'un document
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer l'icône chaîne (partage) |
| **Résultat attendu** | Dialog de partage affiché. |
| **Statut** | ☐ |

---

## 14. Rapports & Statistiques

**Page :** `/reports`

### CT-RAP-01 — Cartes KPI
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | 4 cartes : Total Requêtes (avec tendance %), En cours (avec % du total), Résolus (avec taux de résolution), Temps moyen (en jours). |
| **Statut** | ☐ |

### CT-RAP-02 — Filtres de période et compagnie
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Changer la période (semaine, mois, trimestre, année, tout) 2. Filtrer par compagnie |
| **Résultat attendu** | Tous les graphiques et KPI se mettent à jour. |
| **Statut** | ☐ |

### CT-RAP-03 — Onglet Vue d'ensemble — Graphiques
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Graphique camembert par urgence. Graphiques barres par : compagnie, pôle, type, statut. |
| **Statut** | ☐ |

### CT-RAP-04 — Onglet Tendances
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Graphique aires empilées : tendances mensuelles (Nouveaux, Résolus, En cours). |
| **Statut** | ☐ |

### CT-RAP-05 — Export CSV
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Excel" |
| **Résultat attendu** | Fichier CSV téléchargé avec encodage BOM UTF-8. |
| **Statut** | ☐ |

### CT-RAP-06 — Export PDF
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "PDF" |
| **Résultat attendu** | Boîte de dialogue d'impression du navigateur ouverte avec contenu HTML formaté. |
| **Statut** | ☐ |

---

## 15. Paramètres

**Page :** `/settings`

### CT-SET-01 — Affichage des paramètres
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Recherche de paramètres. Carte "Canal de notification". Tableau des paramètres système (Clé, Valeur, Portée, Pôle, Compagnie). |
| **Statut** | ☐ |

### CT-SET-02 — Changement du canal de notification
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Sélectionner un canal (Email, WhatsApp, ou les deux) |
| **Résultat attendu** | Paramètre `notification_channel` sauvegardé. Description mise à jour. |
| **Statut** | ☐ |

### CT-SET-03 — Ajout d'un paramètre
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Ajouter" 2. Remplir clé*, valeur*, portée 3. Cliquer "Créer" |
| **Résultat attendu** | Paramètre ajouté au tableau. |
| **Statut** | ☐ |

### CT-SET-04 — Recherche de paramètres
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un terme dans la recherche |
| **Résultat attendu** | Tableau filtré par clé, valeur ou portée. |
| **Statut** | ☐ |

---

## 16. Administration

**Page :** `/admin`

### CT-ADM-01 — Accès restreint aux administrateurs
| Élément | Détail |
|---------|--------|
| **Pré-requis** | Rôle `super_admin` ou `syndic_admin` |
| **Résultat attendu** | Page accessible. Les autres rôles ne voient pas le lien dans la sidebar. |
| **Statut** | ☐ |

### CT-ADM-02 — Onglet Utilisateurs — Liste
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Tableau : Username, Nom, Email, Actif?, Rôles. Recherche par nom/email/username. |
| **Statut** | ☐ |

### CT-ADM-03 — Onglet Utilisateurs — Création
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Ajouter" 2. Remplir : Nom*, Email*, Mot de passe* 3. Optionnel : profil étendu (téléphone, prénom, nom, date naissance, sexe, nationalité, adresse, poste, département, contrat, etc.) 4. Cliquer "Créer" |
| **Résultat attendu** | Utilisateur + profil créés. Apparaît dans le tableau. |
| **Statut** | ☐ |

### CT-ADM-04 — Onglet Utilisateurs — Modification
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer sur un utilisateur pour l'éditer 2. Modifier les champs souhaités 3. Optionnel : changer le mot de passe 4. Cliquer "Enregistrer" |
| **Résultat attendu** | Données mises à jour. Toast de succès. |
| **Statut** | ☐ |

### CT-ADM-05 — Onglet Utilisateurs — Profil étendu
| Élément | Détail |
|---------|--------|
| **Champs** | Téléphone, Prénom, Nom, Date de naissance, Lieu de naissance, Sexe, Nationalité, N° identité, Adresse, Bio, Titre professionnel, Département, Type contrat, Date embauche, N° employé, Lieu de travail, Première adhésion?, Syndicat précédent?, Nom syndicat précédent, Motif adhésion, Acceptation règles, Consentement données, Date adhésion, Langue préférée (FR/EN), Photo, Document identité, Contrat de travail, Photo identité, Dernier bulletin |
| **Résultat attendu** | Tous les champs sont éditables et sauvegardés correctement. |
| **Statut** | ☐ |

### CT-ADM-06 — Onglet Compagnies — CRUD
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Créer une compagnie (Nom*, Secteur, Actif) 2. Modifier une compagnie 3. Supprimer une compagnie (avec confirmation) |
| **Résultat attendu** | CRUD complet fonctionnel. Suppression avec AlertDialog de confirmation. |
| **Statut** | ☐ |

### CT-ADM-07 — Onglet Pôles — CRUD
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Créer un pôle (Nom*, Description, Manager, Actif) 2. Modifier 3. Supprimer |
| **Résultat attendu** | CRUD complet. Manager sélectionnable parmi les utilisateurs. |
| **Statut** | ☐ |

### CT-ADM-08 — Onglet Délégués — CRUD
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Créer un délégué (Utilisateur*, Compagnie*, Email, Téléphone, Actif) 2. Modifier 3. Supprimer |
| **Résultat attendu** | CRUD complet fonctionnel. |
| **Statut** | ☐ |

### CT-ADM-09 — Onglet Rôles — Attribution
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer "Ajouter un rôle" 2. Sélectionner : Utilisateur*, Rôle*, Portée (Global/Pôle/Compagnie) 3. Si portée "Pôle" → sélectionner un pôle 4. Si portée "Compagnie" → sélectionner une compagnie 5. Cliquer "Ajouter" |
| **Résultat attendu** | Rôle créé. Apparaît dans le tableau. |
| **Statut** | ☐ |

### CT-ADM-10 — Onglet Rôles — Suppression
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer la corbeille sur un rôle 2. Confirmer |
| **Résultat attendu** | Rôle supprimé. Utilisateur perd les permissions associées. |
| **Statut** | ☐ |

### CT-ADM-11 — Recherche globale admin
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un terme dans la recherche globale |
| **Résultat attendu** | Le contenu de l'onglet actif est filtré par nom/email/username/secteur. |
| **Statut** | ☐ |

---

## 17. Navigation & Composants transverses

### CT-NAV-01 — Sidebar : liens filtrés par ACL
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Chaque lien de la sidebar est visible uniquement si l'utilisateur a la permission correspondante. Les sous-menus activités s'affichent dynamiquement selon les types d'activité configurés. |
| **Statut** | ☐ |

### CT-NAV-02 — Sidebar : mode réduit
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer le bouton de bascule sidebar |
| **Résultat attendu** | Sidebar passe de 256px à 64px. Icônes seules visibles. Tooltips au survol. |
| **Statut** | ☐ |

### CT-NAV-03 — Cloche de notification
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Badge rouge avec compteur des non lues. Popover affichant les 20 dernières notifications. Rafraîchissement automatique toutes les 30 secondes. |
| **Statut** | ☐ |

### CT-NAV-04 — Clic notification cloche → Redirection
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Cliquer une notification dans la cloche |
| **Résultat attendu** | Notification marquée comme lue. Redirection vers `notification.link` (ex: `/tickets/{id}`). |
| **Statut** | ☐ |

### CT-NAV-05 — Menu utilisateur
| Élément | Détail |
|---------|--------|
| **Résultat attendu** | Dropdown avec : avatar (initiales), nom, rôle, liens Profil/Paramètres, bouton Déconnexion (rouge). |
| **Statut** | ☐ |

### CT-NAV-06 — Recherche globale (TopBar)
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Saisir un terme dans la recherche globale |
| **Résultat attendu** | Résultats pertinents affichés (tickets, documents, etc.). |
| **Statut** | ☐ |

### CT-NAV-07 — Page 404
| Élément | Détail |
|---------|--------|
| **Étapes** | 1. Naviguer vers une URL inexistante |
| **Résultat attendu** | Page "Non trouvé" avec lien de retour. |
| **Statut** | ☐ |

---

## 18. Matrice des rôles (ACL)

| Fonctionnalité | super_admin | syndic_admin | pole_manager | pole_member | delegate | hr_liaison | secretary | auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Tableau de bord | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Soumettre requête | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Soumettre pour autrui | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Classifier un ticket | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Mes requêtes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendrier | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Activités | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Délégués | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pôles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Communication | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notation entreprises | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rapports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Administration | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Paramètres | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Résumé des cas de test

| Module | Nombre de cas |
|--------|:---:|
| Authentification | 6 |
| Inscription | 6 |
| Tableau de bord | 5 |
| Soumission de requête | 12 |
| Liste des requêtes | 7 |
| Détail d'une requête | 17 |
| Activités | 11 |
| Calendrier | 6 |
| Communication | 9 |
| Notation entreprises | 6 |
| Annuaire délégués | 5 |
| Gestion des pôles | 4 |
| Documents | 6 |
| Rapports | 6 |
| Paramètres | 4 |
| Administration | 11 |
| Navigation transverse | 7 |
| **Total** | **128** |
