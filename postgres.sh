sudo docker run -d \
	--name fast1_postgres \
	-e POSTGRES_PASSWORD=horsesfly \
	-e PGDATA=/var/lib/postgresql/data/pgdata \
	-v /tank/fast1:/var/lib/postgresql/data \
	-p 5433:5432 \
	postgres
