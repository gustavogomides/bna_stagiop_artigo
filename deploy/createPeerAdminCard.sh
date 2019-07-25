Usage() {
echo ""
echo "Usage: ./createPeerAdminCard.sh [-h host] [-n]"
echo ""
echo "Options:"
echo -e "\t-h or --host:\t\t(Optional) name of the host to specify in the connection profile"
echo -e "\t-n or --noimport:\t(Optional) don't import into card store"
echo ""
echo "Example: ./createPeerAdminCard.sh"
echo ""
exit 1
}
Parse_Arguments() {
while [ $# -gt 0 ]; do
case $1 in
--help)
HELPINFO=true
;;
--host | -h)
shift
HOST="$1"
;;
--noimport | -n)
NOIMPORT=true
;;
esac
shift
done
}
HOST=localhost
Parse_Arguments $@
if [ "${HELPINFO}" == "true" ]; then
Usage
fi
# Grab the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -z "${HL_COMPOSER_CLI}" ]; then
HL_COMPOSER_CLI=$(which composer)
fi
echo
# check that the composer command exists at a version >v0.16
COMPOSER_VERSION=$("${HL_COMPOSER_CLI}" --version 2>/dev/null)
COMPOSER_RC=$?
if [ $COMPOSER_RC -eq 0 ]; then
AWKRET=$(echo $COMPOSER_VERSION | awk -F. '{if ($2<19) print "1"; else print "0";}')
if [ $AWKRET -eq 1 ]; then
echo Cannot use $COMPOSER_VERSION version of composer with fabric 1.1, v0.19 or higher is required
exit 1
else
echo Using composer-cli at $COMPOSER_VERSION
fi
else
echo 'No version of composer-cli has been detected, you need to install composer-cli at v0.19 or higher'
exit 1
fi
cat << EOF > DevServer_connection.json
{
    "name": "hlfv1",
    "x-type": "hlfv1",
    "version": "1.0.0",
    "client": {
        "organization": "Org1",
        "connection": {
            "timeout": {
                "peer": {
                    "endorser": "300",
                    "eventHub": "300",
                    "eventReg": "300"
                },
                "orderer": "300"
            }
        }
    },
    "channels": {
        "mychannel": {
            "orderers": [
                "orderer.example.com"
            ],
            "peers": {
                "peer0.org1.example.com": {
                    "endorsingPeer": true,
                    "chaincodeQuery": true,
                    "eventSource": true
                },
                "peer1.org1.example.com": {
                    "endorsingPeer": true,
                    "chaincodeQuery": true,
                    "eventSource": true
                }
            }
        }
    },
    "organizations": {
        "Org1": {
            "mspid": "Org1MSP",
            "peers": [
                "peer0.org1.example.com",
                "peer1.org1.example.com"
            ],
            "certificateAuthorities": [
                "ca.example.com"
            ]
        }
    },
    "orderers": {
        "orderer.example.com": {
            "url": "grpc://35.224.86.27:7050",
            "grpcOptions": {
                "ssl-target-name-override": "orderer.example.com"
            },
            "tlsCACerts": {
                "pem": "-----BEGIN CERTIFICATE-----\nMIICNTCCAdugAwIBAgIQQfnauawinig1TrkYa17F7jAKBggqhkjOPQQDAjBsMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEUMBIGA1UEChMLZXhhbXBsZS5jb20xGjAYBgNVBAMTEXRsc2NhLmV4\nYW1wbGUuY29tMB4XDTE5MDcyNTAzNDMwNFoXDTI5MDcyMjAzNDMwNFowbDELMAkG\nA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFu\nY2lzY28xFDASBgNVBAoTC2V4YW1wbGUuY29tMRowGAYDVQQDExF0bHNjYS5leGFt\ncGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABMbZC+rcBxDJTzm3bZjt\nrlywX1E4rM62lgjVhUTSVLzPu0mFsUQaGd4zRDH7vzaCo72c+r9dzZZ5glP2+8xr\nqhijXzBdMA4GA1UdDwEB/wQEAwIBpjAPBgNVHSUECDAGBgRVHSUAMA8GA1UdEwEB\n/wQFMAMBAf8wKQYDVR0OBCIEIFbogddo1jyHkFH94jRBe7wC9rxKDO2K8mpmE6D6\nS5/gMAoGCCqGSM49BAMCA0gAMEUCIQCtxZitMa0NhX9Zw/FNsCezefpOFzDcRZvu\nQ9h71C2/9AIgFeL/k10EQwgplcTIiIGU++9gADkiTRJ1jbd7KaVI6ds=\n-----END CERTIFICATE-----\n"
            }
        }
    },
    "peers": {
        "peer0.org1.example.com": {
            "url": "grpc://35.224.86.27:7051",
            "eventUrl": "grpc://35.224.86.27:7053",
            "grpcOptions": {
                "ssl-target-name-override": "peer0.org1.example.com"
            },
            "tlsCACerts": {
                "pem": "-----BEGIN CERTIFICATE-----\nMIICSDCCAe+gAwIBAgIQWTicdG9/1yV3C4g8+5p/CzAKBggqhkjOPQQDAjB2MQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEfMB0GA1UEAxMWdGxz\nY2Eub3JnMS5leGFtcGxlLmNvbTAeFw0xOTA3MjUwMzQzMDRaFw0yOTA3MjIwMzQz\nMDRaMHYxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQH\nEw1TYW4gRnJhbmNpc2NvMRkwFwYDVQQKExBvcmcxLmV4YW1wbGUuY29tMR8wHQYD\nVQQDExZ0bHNjYS5vcmcxLmV4YW1wbGUuY29tMFkwEwYHKoZIzj0CAQYIKoZIzj0D\nAQcDQgAENSjGtlOERuaf3Pj7w9+ibXjo8t+1SA75n2XvtQoOgIqpvtw/+fnDSx2A\naPHeBV7vRgMHo7doIpQ6OuO7ASnoyKNfMF0wDgYDVR0PAQH/BAQDAgGmMA8GA1Ud\nJQQIMAYGBFUdJQAwDwYDVR0TAQH/BAUwAwEB/zApBgNVHQ4EIgQgoZ5ZKPysvQOK\nC6y3mUbbHAVo+z3rIANGnp+W490+HCowCgYIKoZIzj0EAwIDRwAwRAIgYoDaD8rU\nSxW1MjWkjq6TOaaYSYNRhpM6Q7Ky+XJQl5wCIBorHOBBOFqCdUHr8LleaR4WyE0h\nsoA09b01vg2Em/h5\n-----END CERTIFICATE-----\n"
            }
        },
        "peer1.org1.example.com": {
            "url": "grpc://199.223.232.53:8051",
            "eventUrl": "grpc://199.223.232.53:8053",
            "grpcOptions": {
                "ssl-target-name-override": "peer1.org1.example.com"
            },
            "tlsCACerts": {
                "pem": "-----BEGIN CERTIFICATE-----\nMIICSDCCAe+gAwIBAgIQWTicdG9/1yV3C4g8+5p/CzAKBggqhkjOPQQDAjB2MQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEfMB0GA1UEAxMWdGxz\nY2Eub3JnMS5leGFtcGxlLmNvbTAeFw0xOTA3MjUwMzQzMDRaFw0yOTA3MjIwMzQz\nMDRaMHYxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQH\nEw1TYW4gRnJhbmNpc2NvMRkwFwYDVQQKExBvcmcxLmV4YW1wbGUuY29tMR8wHQYD\nVQQDExZ0bHNjYS5vcmcxLmV4YW1wbGUuY29tMFkwEwYHKoZIzj0CAQYIKoZIzj0D\nAQcDQgAENSjGtlOERuaf3Pj7w9+ibXjo8t+1SA75n2XvtQoOgIqpvtw/+fnDSx2A\naPHeBV7vRgMHo7doIpQ6OuO7ASnoyKNfMF0wDgYDVR0PAQH/BAQDAgGmMA8GA1Ud\nJQQIMAYGBFUdJQAwDwYDVR0TAQH/BAUwAwEB/zApBgNVHQ4EIgQgoZ5ZKPysvQOK\nC6y3mUbbHAVo+z3rIANGnp+W490+HCowCgYIKoZIzj0EAwIDRwAwRAIgYoDaD8rU\nSxW1MjWkjq6TOaaYSYNRhpM6Q7Ky+XJQl5wCIBorHOBBOFqCdUHr8LleaR4WyE0h\nsoA09b01vg2Em/h5\n-----END CERTIFICATE-----\n"
            }
        }
    },
    "certificateAuthorities": {
        "ca.example.com": {
            "url": "http://35.224.86.27:7054",
            "caName": "ca.example.com",
            "httpOptions": {
                "verify": false
            }
        }
    }
}
EOF
PRIVATE_KEY="${DIR}"/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/57314ccb418ef2ceec83bc91bd30a280611ec56eedca1e93135df970b0f46e5a_sk
CERT="${DIR}"/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
if [ "${NOIMPORT}" != "true" ]; then
CARDOUTPUT=/tmp/PeerAdmin@hlfv1.card
else
CARDOUTPUT=PeerAdmin@hlfv1.card
fi
"${HL_COMPOSER_CLI}" card create -p DevServer_connection.json -u PeerAdmin -c "${CERT}" -k "${PRIVATE_KEY}" -r PeerAdmin -r ChannelAdmin --file $CARDOUTPUT
if [ "${NOIMPORT}" != "true" ]; then
if "${HL_COMPOSER_CLI}" card list -c PeerAdmin@hlfv1 > /dev/null; then
"${HL_COMPOSER_CLI}" card delete -c PeerAdmin@hlfv1
fi
"${HL_COMPOSER_CLI}" card import --file /tmp/PeerAdmin@hlfv1.card 
"${HL_COMPOSER_CLI}" card list
echo "Hyperledger Composer PeerAdmin card has been imported, host of fabric specified as '${HOST}'"
rm /tmp/PeerAdmin@hlfv1.card
else
echo "Hyperledger Composer PeerAdmin card has been created, host of fabric specified as '${HOST}'"
fi
