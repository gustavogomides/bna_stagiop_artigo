set -ev
# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1
docker-compose -f docker-compose-peer2.yml down
docker-compose -f docker-compose-peer2.yml up -d peer1.org1.ita.br couchdb1
export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}
# Create the channel
docker exec -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.ita.br/msp" peer1.org1.ita.br peer channel fetch config -o orderer.ita.br:7050 -c mychannel
docker exec -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.ita.br/msp" peer1.org1.ita.br peer channel join -b mychannel_config.block