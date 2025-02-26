const run = require('.');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

jest.mock('@actions/core');
jest.mock('tmp');
jest.mock('fs');

describe('Render task definition', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    core.getInput = jest.fn()
      .mockReturnValueOnce('task-definition.json')  // task-definition
      .mockReturnValueOnce('web-production')        // family-name
      .mockReturnValueOnce('web')                   // container-name
      .mockReturnValueOnce({                        // container-attrs
        image: 'nginx:latest',
        name: 'web-new-name'
      })
      .mockReturnValueOnce([ 'sidecar' ]);          // remove-containers

    process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });
    process.env = Object.assign(process.env, { RUNNER_TEMP: '/home/runner/work/_temp' });

    tmp.fileSync.mockReturnValue({
      name: 'new-task-def-file-name'
    });

    fs.existsSync.mockReturnValue(true);

    jest.mock('./task-definition.json', () => ({
      family: 'task-def-family',
      containerDefinitions: [
        {
          name: "web",
          image: "some-other-image"
        },
        {
          name: "sidecar",
          image: "hello"
        }
      ]
    }), { virtual: true });
  });


  // test('renders the task definition and creates a new task def file', async () => {
  //   await run();
  //   expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
  //     tmpdir: '/home/runner/work/_temp',
  //     prefix: 'task-definition-',
  //     postfix: '.json',
  //     keep: true,
  //     discardDescriptor: true
  //   });
  //   expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
  //     JSON.stringify({
  //       family: 'web-production',
  //       containerDefinitions: [
  //         {
  //           name: "web-new-name",
  //           image: "nginx:latest"
  //         }
  //       ]
  //     }, null, 2)
  //   );
  //   expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
  // });


  test('renders a task definition at an absolute path', async () => {
    core.getInput = jest.fn()
      .mockReturnValueOnce('/hello/task-definition.json') // task-definition
      .mockReturnValueOnce('web-production')              // family-name
      .mockReturnValueOnce('web')                         // container-name
      .mockReturnValueOnce({                              // container-attrs
        image: 'nginx:latest',
        name: 'web-new-name'
      })
      .mockReturnValueOnce();                           // remove-containers
    jest.mock('/hello/task-definition.json', () => ({
      family: 'task-def-family',
      containerDefinitions: [
        {
          name: "web",
          image: "some-other-image"
        }
      ]
    }), { virtual: true });

    await run();

    expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
      tmpdir: '/home/runner/work/_temp',
      prefix: 'task-definition-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    });
    expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
      JSON.stringify({
        family: 'web-production',
        containerDefinitions: [
          {
            name: "web-new-name",
            image: "nginx:latest"
          }
        ]
      }, null, 2)
    );
    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'task-definition', 'new-task-def-file-name');
  });


  test('permits json string values to be given', async () => {
    core.getInput = jest.fn()
      .mockReturnValueOnce('task-definition.json')  // task-definition
      .mockReturnValueOnce('web-production')        // family-name
      .mockReturnValueOnce('web')                   // container-name
      .mockReturnValueOnce('{ "image": "nginx:latest", "name": "web-new-name" }') // container-attrs
      .mockReturnValueOnce('[ "sidecar" ]');        // remove-containers

    await run();
    expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-task-def-file-name',
      JSON.stringify({
        family: 'web-production',
        containerDefinitions: [
          {
            name: "web-new-name",
            image: "nginx:latest"
          }
        ]
      }, null, 2)
    );
  });


  test('error returned for missing task definition file', async () => {
    fs.existsSync.mockReturnValue(false);
    core.getInput = jest.fn()
      .mockReturnValueOnce('no-task-def.json')      // task-definition
      .mockReturnValueOnce('web-production')        // family-name
      .mockReturnValueOnce('web')                   // container-name
      .mockReturnValueOnce({                        // container-attrs
        image: 'nginx:latest',
        name: 'web-new-name'
      })
      .mockReturnValueOnce(['sidecar']);            // remove-containers

    await run();

    expect(core.setFailed).toBeCalledWith('Task definition file does not exist: no-task-def.json');
  });


  test('error returned for non-JSON task definition contents', async () => {
    jest.mock('./non-json-task-def.json', () => ("hello"), { virtual: true });

    core.getInput = jest.fn()
      .mockReturnValueOnce('non-json-task-def.json')  // task-definition
      .mockReturnValueOnce('web-production')          // family-name
      .mockReturnValueOnce('web')                     // container-name
      .mockReturnValueOnce({                          // container-attrs
        image: 'nginx:latest'
      })
      .mockReturnValueOnce([]);                       // remove-containers

    await run();

    expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
  });


  test('error returned for malformed task definition with non-array container definition section', async () => {
    jest.mock('./malformed-task-def.json', () => ({
      family: 'task-def-family',
      containerDefinitions: {}
    }), { virtual: true });

    core.getInput = jest.fn()
      .mockReturnValueOnce('malformed-task-def.json') // task-definition
      .mockReturnValueOnce('web-production')        // family-name
      .mockReturnValueOnce('web')                     // container-name
      .mockReturnValueOnce({                          // container-attrs
        image: 'nginx:latest'
      })
      .mockReturnValueOnce([]);                       // remove-containers

    await run();

    expect(core.setFailed).toBeCalledWith('Invalid task definition format: containerDefinitions section is not present or is not an array');
  });


  test('error returned for task definition without matching container name', async () => {
    jest.mock('./missing-container-task-def.json', () => ({
      family: 'task-def-family',
      containerDefinitions: [
        {
          name: "main",
          image: "some-other-image"
        }
      ]
    }), { virtual: true });

    core.getInput = jest.fn()
      .mockReturnValueOnce('missing-container-task-def.json') // task-definition
      .mockReturnValueOnce('web-production')                  // family-name
      .mockReturnValueOnce('web')                             // container-name
      .mockReturnValueOnce({                                  // container-attrs
        image: 'nginx:latest'
      })
      .mockReturnValueOnce([]);                               // remove-containers

    await run();

    expect(core.setFailed).toBeCalledWith("Invalid task definition: Container definition 'web' not found");
  });


});
