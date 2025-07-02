# G3D

## Description

G3D est une application web (SaaS) dédiée à la création, la visualisation et la manipulation de scènes 3D directement depuis un navigateur.  
Inspirée par des outils collaboratifs comme Figma, G3D vise à devenir une plateforme de référence pour la conception 3D collaborative en temps réel.

Actuellement développée en React.js, une migration vers Next.js est prévue afin d’optimiser le référencement et d’améliorer les performances globales de l’application.

---

## Technologies utilisées

- **React.js**  
- **SCSS**
---

## Fonctionnalités principales

### Affichage en temps réel de la scène  
L’interface de G3D permet d’afficher en temps réel la scène en cours de construction.  
Pour aider à la navigation et à la perception de l’espace, une grille quadrillée est visible, composée de cases de 1 mètre par 1 mètre, ainsi que deux lignes repères indiquant les directions des axes X et Y.

### Création intuitive de formes 3D  
La création de meshs (formes 3D) se fait facilement à partir du menu situé en haut à gauche de l’interface.  
Il suffit de sélectionner une forme dans un menu déroulant, et celle-ci sera automatiquement ajoutée au centre de la scène.  
Il est actuellement possible de créer plusieurs formes de base, aussi bien en 2D (cercle, carré) qu’en 3D (sphère, cube).

### Modification et transformation en temps réel   
La sélection des meshs peut se faire individuellement en cliquant dessus, ou par sélection multiple via Ctrl + clic.  
Lorsqu’un ou plusieurs meshs sont sélectionnés, un panneau latéral droit s’affiche automatiquement.  
Ce menu permet de modifier les propriétés fondamentales des objets sélectionnés : position, échelle (taille), et rotation dans l’espace.

---

## Informations complémentaires

- **Durée du projet** : 1 mois  
- **Contributeurs** : 1 personne
---

## Liens  
- Démo en ligne : [https://g3d-poc.vercel.app/](https://g3d-poc.vercel.app/)
