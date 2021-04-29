const path = require('path');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

async function run() {
  try {
    // Get inputs
    const taskDefinitionFile = core.getInput('task-definition', { required: true });
    const containerName = core.getInput('container-name', { required: false });
    let containerAttrs = core.getInput('container-attrs', { required: false });
    let containerNamesToRemove = core.getInput('remove-containers', { required: false });

    // Permit these attrs to be passed as json strings, as GitHub Actions
    // don't currnelty allow array or hash values to be given as inputs
    if (typeof containerAttrs === 'string') { containerAttrs = JSON.parse(containerAttrs) }
    if (typeof containerNamesToRemove === 'string') { containerNamesToRemove = JSON.parse(containerNamesToRemove) }

    const containerAttrKeys = containerAttrs ? Object.getOwnPropertyNames(containerAttrs) : []

    // Parse the task definition
    const taskDefPath = path.isAbsolute(taskDefinitionFile) ?
      taskDefinitionFile :
      path.join(process.env.GITHUB_WORKSPACE, taskDefinitionFile);
    if (!fs.existsSync(taskDefPath)) {
      throw new Error(`Task definition file does not exist: ${taskDefinitionFile}`);
    }
    const taskDefContents = require(taskDefPath);

    // Validate the task defintion
    if (!Array.isArray(taskDefContents.containerDefinitions)) {
      throw new Error('Invalid task definition format: containerDefinitions section is not present or is not an array');
    }

    // Require containerName if any container atttibutes present
    if (containerAttrKeys.length) {
      if (!containerName) { throw new Error('containerName is required when using containerAttrs'); }

      // Get the container definition
      const containerDef = taskDefContents.containerDefinitions.find(function(element) {
        return element.name == containerName;
      });
      if (!containerDef) {
        throw new Error(`Invalid task definition: Container definition '${containerName}' not found`);
      }

      // Handle changes to container definition
      containerAttrKeys.forEach(function(key) { containerDef[key] = containerAttrs[key] })
    }

    // Any containers to remove?
    if (containerNamesToRemove) {
      if (!Array.isArray(containerNamesToRemove)) {
        throw new Error(`containerNamesToRemove must be an array or blank but was type '${typeof containerNamesToRemove}'`);
      }
      containerNamesToRemove.forEach(function(nameToRemove) {
        const containerIndex = taskDefContents.containerDefinitions.findIndex(function(containerDef) {
          return containerDef.name === nameToRemove;
        });
        if (containerIndex === -1) {
          throw new Error(`Unable to remove container with name '${nameToRemove}'. Not found`);
        }
        taskDefContents.containerDefinitions.splice(containerIndex, 1)
      })
    }

    // Write out a new task definition file
    var updatedTaskDefFile = tmp.fileSync({
      tmpdir: process.env.RUNNER_TEMP,
      prefix: 'task-definition-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    });
    const newTaskDefContents = JSON.stringify(taskDefContents, null, 2);
    fs.writeFileSync(updatedTaskDefFile.name, newTaskDefContents);
    core.setOutput('task-definition', updatedTaskDefFile.name);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
    run();
}
