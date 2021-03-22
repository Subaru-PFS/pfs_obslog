cd $(dirname $0)
docker run -v "$PWD/schemaspy.properties:/schemaspy.properties"  -v "$PWD/html:/output" schemaspy/schemaspy:latest
