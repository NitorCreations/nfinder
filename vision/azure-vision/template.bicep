@description('Location for all resources.')
param location string = resourceGroup().location
param visionName string

@description('SKU for Computer Vision API')
@allowed([
  'F0'
  'S1'
])
param SKU string = 'F0'
//param identity object
//param virtualNetworkType string
//param ipRules array
//param subnet1Name string = 'subnet-1'
//param virtualNetworkName string = 'virtualNetwork'


// This will build a Virtual Network.
// resource vnet 'Microsoft.Network/virtualNetworks@2020-06-01' = {
//   name: virtualNetworkName
//   location: location
//   properties: {
//     addressSpace: {
//       addressPrefixes: [
//         '10.0.0.0/16'
//       ]
//     }
//     subnets: [
//       {
//         name: subnet1Name
//         properties: {
//           addressPrefix: '10.0.0.0/24'
//         }
//       }
      
//     ]
//   }
// }

// This will build a Computer Vision service.
resource visionApi 'Microsoft.CognitiveServices/accounts@2021-10-01' = {
  name: visionName
  location: location
  kind: 'ComputerVision'
  sku: {
    name: SKU
  }
//  identity: identity
  properties: {
    //customSubDomainName: toLower(visionName)
    publicNetworkAccess: 'Enabled'
  }
}

#disable-next-line outputs-should-not-contain-secrets
output visionApiKey string = visionApi.listKeys().key1
