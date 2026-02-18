# partyShots

live site: 
[http://51.20.201.88/]

This is a site intended for easy photo sharing.

## Description 

This app has **users**, **albums**, and **photos** (which may any type of file). 

Users create albums.

Albums have flags for **open** and **public**

**open** means others can upload files.
**public** means it shows up on a users page.

Any user can upload photos to any album.  

Only an album owner can delete an album.  

A photo can be deleted by the album owner, or the photo owner.  




## Technologies used

### backend

**FastAPI** server with JWT Auth, and authorized websockets

**redis** for arq background workers and authorization

**postgres** backend database

**nginx** proxy and static serving

**docker** and docker-compose

**EC2** hosting

**S3** direct uploads to S3, the server only stores metadata. 

**React/Vite** frontend








## todo list

* Cloudfront & S3 setup
* add editors table
* track item size
* item sorting 



## deploy notes 

* build front end before image, it is not part of the Dockerfile
* there are three environment files to create.  
  * **.env** - database location for docker-compose
  * **backend/env.py** - aws, everything else for the server
  * **frontend/.env**  - websocket url
