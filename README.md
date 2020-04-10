# NodeESGIProject

### 	Description du projet

Le projet est une API de gestion de notes personnelles. Elle permet aux utilisateurs s'étant créés un identifiant, de se connecter et d'accéder à la gestion des notes.

Les notes sont enregistrées de manières à ce que l'on puisse retrouver ses notes, dans l’ordre antichronologique, avec leur date de création et de mise à jour.

#### 1. Récupérer le projet depuis GitHub : 
```shell
$ git clone https://github.com/SoKaii/NodeESGIProject.git
$ cd NodeESGIProject
```
#### 2. Installer les dépendances & démarrer le serveur : 
```shell
$ npm install
$ npm start / $ node server.js
```
#### 3. Les différentes routes :
##### a. Créer un utilisateur (/signup) :
*Pour créer un utilisateur la requête doit contenir 2 paramètres, un nom d'utilisateur (entre 2 et 20 caractères, en minuscules non accentuées) et un mot de passe (de minimums 4 caractères).*

```shell
$ curl -X POST --header "Content-Type: application/json" --data "{\"username\":\"Utilisateur\", \"password\":\"MotDePasse\"}" https://<app heroku>/signup
```

##### b. Se connecter à un utilisateur (/signin) :
*Pour se connecter à un utilisateur la requete doit contenir 2 paramètres, un nom d'utilisateur et un mot de passe, avec les mêmes critères que lors de la création.
Ces 2 paramètres doivent êtres existant dans la base de données.*

```shell
$ curl -X POST --header "Content-Type: application/json" --data "{\"username\":\"Utilisateur\", \"password\":\"MotDePasse\"}" https://<app heroku>/signin
```

##### c. Récupérer toutes ses notes (/notes) :
*Pour récupérer toutes ses notes présentes dans la base de données, il faut au préalable être connecté à un utilisateur.*

```shell
$ curl -X GET --header "Content-Type: application/json" https://<app heroku>/get
```

##### d. Ajouter une notes (/notes) :
*Pour pouvoir ajouter une note, il faut au préalable être connecté à un utilisateur.
La note prend un seul paramètre dans la requête, la contenue.*

```shell
$ curl -X PUT --header "Content-Type: application/json" --data "{\"content\":\"Contenue de la note\"}" https://<app heroku>/notes
```

##### e. Modifier une notes (/notes/:id) :
*Pour pouvoir modifier une note, il faut au préalable être connecté à un utilisateur.
L'URL prend en paramètre l'id de la note à modifié, et la requête prend elle le contenue en paramètre.*

```shell
$ curl -X PATCH --header "Content-Type: application/json" --data "{\"content\":\"Contenue de la note\"}" https://<app heroku>/notes/:id
```

##### f. Supprimer une notes (/notes/:id) :
*Pour pouvoir supprimer une note, il faut au préalable être connecté à un utilisateur.
L'URL prend en paramètre l'id de la note à supprimer.*

```shell
$ curl -X DELETE --header "Content-Type: application/json" https://<app heroku>/notes/:id
```

