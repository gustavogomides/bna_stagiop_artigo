### Deploying a Hyperledger Composer blockchain business network to Hyperledger Fabric for a single organization

composer card create -p connection.json -u PeerAdmin -c signcerts/Admin@org1.example.com-cert.pem -k keystore/114aab0e76bf0c78308f89efc4b8c9423e31568da0c340ca187a9b17aa9a4457_sk -r PeerAdmin -r ChannelAdmin

composer archive create -t dir -n .

composer card import -f PeerAdmin@stagiopbd-network.card

composer network install -c PeerAdmin@stagiopbd-network -a stagiopbd-network@0.0.1.bna

composer network start --networkName stagiopbd-network --networkVersion 0.0.1 --networkAdmin admin --networkAdminEnrollSecret adminpw --card PeerAdmin@stagiopbd-network

composer card import -f admin@stagiopbd-network.card

composer network ping -c admin@stagiopbd-network
