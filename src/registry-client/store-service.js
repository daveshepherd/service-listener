const request = require('request-promise-native');
const { getService } = require('./get-service');
const env = require('../env-vars');
const co = require('co');
const logger = require('ww-logging').logger();

function sanitiseResponse( service ) {
  var sanitisedService = JSON.parse(JSON.stringify(service));
  delete sanitisedService.__v;
  delete sanitisedService.createdAt;
  delete sanitisedService.updatedAt;
  return sanitisedService;
}

function updateEnvironmentBaseUrl( service, environmentId, baseUrl ) {
  if (service.environments == null) {
    service.environments = [];
  } else {
    for (var i in service.environments) {
      if (service.environments[i]._id === environmentId) {
        service.environments[i].baseUrl = baseUrl;
        return true;
      }
    }
  }
  return false;
}

const storeService = (serviceName, environment) =>
{
  return co(function*() {
    return yield getService(serviceName);
  }).then(function (retreivedService) {
    if (retreivedService == null) {
      const newService = {_id: serviceName, environments: [ environment ]};
      logger.debug('Storing new service: ' + JSON.stringify(newService, null, 2));
      return request({
        url: `${env.SERVICE_REGISTRY_URL}/v1/service`,
        method: 'POST',
        json: true,
        body: newService
      });
    } else {

      const updatedService = sanitiseResponse(retreivedService);

      if (!updateEnvironmentBaseUrl(updatedService, environment._id, environment.baseUrl)) {
        updatedService.environments.push(environment);
      }
      logger.debug('Updating existing service: ' + JSON.stringify(updatedService, null, 2));

      return request({
        url: `${env.SERVICE_REGISTRY_URL}/v1/service/${serviceName}`,
        method: 'PUT',
        json: true,
        body: updatedService
      });
    }
  }).catch((e) => {
    logger.error(`${e}`);
    // TODO: throw!
  });
}

module.exports = {
  storeService,
};
