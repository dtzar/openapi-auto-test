const minimist = require('minimist');
const refParser = require('json-schema-ref-parser');
//const getUIReadySchema = require('./open-api/schemaParser');

let args = minimist(process.argv.slice(2), {  
    alias: {
        h: 'help',
        v: 'version',
        f: 'file'
    }
});
console.log('args:', args);
fs = require('fs')
fs.readFile(args.f, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }

  var jsonObj = JSON.parse(data);
  for (var x=0;x<jsonObj.servers.length;x++)
  {
    console.log("Server: " + jsonObj.servers[x].url);
  }

  const pathIds = Object.keys(jsonObj.paths)
  buildNavigationAndServices(jsonObj.paths, jsonObj.servers, null,null);
});

function buildNavigationAndServices (paths, servers, apiSecurity, securityDefinitions, exclusionFunc = null) {
    const pathIds = Object.keys(paths)
    const navigationMethods = []
    const servicesMethods = []
    const isFunc = typeof exclusionFunc === 'function'
    for (var x=0;x<pathIds.length;x++)
    {
        for (let j = 0, pathIdLength = pathIds.length; j < pathIdLength; j++) {
            const pathId = pathIds[j]
            const path = paths[pathId]
            const methodTypes = Object.keys(path)
        
            for (let k = 0, methodLength = methodTypes.length; k < methodLength; k++) {
            const methodType = methodTypes[k]
            const method = Object.assign({ type: methodType }, path[methodType])
        
            // Should this be included in the output?
            if (isFunc && exclusionFunc(method)) {
                continue
            }
        
            // Add the navigation item
            navigationMethods.push(getNavigationMethod(pathId, method))
        
            // Construct the full method object
            const servicesMethod = getServicesMethod({
                path: pathId,
                servers,
                method,
                request: getUIRequest(method.description, method.requestBody),
                params: getUIParameters(method.parameters),
                responses: getUIResponses(method.responses)
            })
        
            // Security can be declared per method, or globally for the entire API.
            //   if (method.security) {
            //     servicesMethod.security = getUISecurity(method.security, securityDefinitions)
            //   } else if (apiSecurity.length) {
            //     servicesMethod.security = getUISecurity(apiSecurity, securityDefinitions)
            //   }
        
            servicesMethods.push(servicesMethod)
            }
        }
    }
    console.log(navigationMethods);
    console.log(servicesMethods);
}  

function getNavigationMethod (path, method, tag) {
    return {
      type: method.type,
      title: method.summary,
      link: getPermalink(path, method.type)
    }
}

function getPermalink (path, methodType) {
    return `${path}/${methodType}`
}

function getServicesMethod ({path, servers, method, request, params, responses}) {
    const servicesMethod = {
      type: method.type,
      title: method.summary,
      link: getPermalink(path, method.type),
      path,
      request,
      responses
    }
  
    if (method.description) {
      servicesMethod.description = method.description
    }
  
    if (method.externalDocs) {
      servicesMethod.docs = method.externalDocs
    }
  
    if (params) {
      servicesMethod.parameters = params
    }
  
    if (servers && servers.length > 0) {
      servicesMethod.endpoints = servers.map(server => {
        const endpoint = {
          url: server.url + path
        }
  
        if (server.description) {
          endpoint.description = server.description
        }
  
        return endpoint
      })
    }
  
    return servicesMethod
  }

  function getUIRequest (description, requestBody = null) {
    const uiRequest = {}
  
    if (description) {
      uiRequest.description = description
    }
  
    if (requestBody) {
      const mediaType = getMediaType(requestBody.content)
  
      if (mediaType) {
        addMediaTypeInfoToUIObject(uiRequest, mediaType)
      }
    }
  
    return uiRequest
  }
    
  function getUIParameters (parameters) {
    if (parameters) {
      const uiParameters = {}
      const parameterTypes = ['path', 'query', 'header', 'cookie']
  
      parameterTypes.forEach(parameterType => {
        const uiParameter = getUIParametersForLocation(parameters, parameterType)
  
        if (uiParameter) {
          uiParameters[parameterType] = uiParameter
        }
      })
  
      return uiParameters
    }
  
    return null
  }
  
  /**
   * Construct a parameters array for a location, ready to be consumed by the UI
   *
   * @param {Array} parameters
   * @param {String} location. Possible values: query, path, header, cookie
   * @return {Array}
   */
  function getUIParametersForLocation (parameters, location) {
    if (!parameters) {
      return null
    }
  
    const resultArray = parameters.filter(parameter => (parameter.in === location)).map(parameter => {
      const uiParameter = {
        name: parameter.name,
        required: parameter.required
      }
  
      if (parameter.description) {
        uiParameter.description = parameter.description
      }
  
      // TODO: We set the type to be an array because the Property component
      // handles this. Property should eventually be split and this won't be
      // necessary...
      if (parameter.type) {
        uiParameter.types = [parameter.type]
      } else if (parameter.schema && parameter.schema.type) {
        uiParameter.types = [parameter.schema.type]
      }
  
      if (parameter.schema && parameter.schema.default !== undefined) {
        uiParameter.defaultValue = parameter.schema.default
      }
      
      //need to peel example out of they have it
     
      return uiParameter
    })
  
    return resultArray.length ? resultArray : null
  }

  function getUIResponses (responses) {
    const uiResponses = []
  
    for (const statusCode in responses) {
      const response = responses[statusCode]
      const uiResponse = {
        code: statusCode
      }
  
      if (response.description) {
        uiResponse.description = response.description
      }
  
      const mediaType = getMediaType(response.content)
  
      if (mediaType) {
        addMediaTypeInfoToUIObject(uiResponse, mediaType)
      }
  
      uiResponses.push(uiResponse)
    }
  
    return uiResponses
  }

  function getMediaType (content) {
    if (!content) {
      return null
    }
  
    const mediaTypeIds = Object.keys(content)
  
    for (const mediaTypeId of mediaTypeIds) {
      const mediaType = content[mediaTypeId]
  
      if (mediaType.schema) {
        return mediaType
      }
    }
  
    return null
  }
  function addMediaTypeInfoToUIObject (uiObject, mediaType) {
    // if (mediaType.schema) {
    //   const schema = getUIReadySchema(mediaType.schema)
  
    //   if (schema.length) {
    //     uiObject.schema = schema
    //   }
    // }
  
    let examples = []
  
    if (mediaType.example) {
      examples.push(mediaType.example)
    }
  
    if (mediaType.examples) {
      examples = [...examples, ...Object.keys(mediaType.examples).map(
        (example) => mediaType.examples[example]
      )]
    }
  
    if (examples.length) {
      uiObject.examples = examples
    }
  }
  