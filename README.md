## Amazon ECS "Render Task Definition" Action for GitHub Actions

Inserts a container image URI into an Amazon ECS task definition JSON file, creating a new task definition file.

**Table of Contents**

<!-- toc -->

- [Usage](#usage)
- [License Summary](#license-summary)
- [Security Disclosures](#security-disclosures)

<!-- tocstop -->

## Usage

Example to edit some attributes for the `web` container in the task definition file, and then deploy the edited task definition file to ECS:

```yaml
    - name: Render "web" ECS task definition
      id: render-web-container
      uses: benwigley/amazon-ecs-render-task-definition@v2.0.3
      with:
        task-definition: task-definition.json
        container-name: web
        container-attrs: '{ "image": "amazon/amazon-ecs-sample:latest" }'

    - name: Render "worker" ECS task definition
      id: render-worker-container
      uses: benwigley/amazon-ecs-render-task-definition@v2.0.3
      with:
        task-definition: ${{ steps.render-web-container.outputs.task-definition }}
        container-name: web
        container-attrs: '{ "image": "amazon/amazon-ecs-sample:latest", "name": "web-worker", "cpu": 256, "memory": 512 }'
        remove-containers: '["sidecarr"]'

    - name: Deploy web to Amazon ECS service
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.render-web-container.outputs.task-definition }}
        service: my-web-service
        cluster: my-cluster

    - name: Deploy worker to Amazon ECS service
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.render-worker-container.outputs.task-definition }}
        service: my-worker-service
        cluster: my-cluster
```

If your task definition file holds multiple containers in the `containerDefinitions`
section which require updated attributes, chain multiple executions of this action
together using the output value from the first action for the `task-definition`
input of the second:

```yaml
    - name: Render Amazon ECS task definition for first container
      id: render-web-1-container
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: web-1
        container-attrs: '{ "image": "amazon/amazon-ecs-sample-1:latest" }'

    - name: Modify Amazon ECS task definition with second container
      id: render-web-2-container
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: ${{ steps.render-web-1-container.outputs.task-definition }}
        container-name: web-2
        container-attrs: '{ "image": "amazon/amazon-ecs-sample-2:latest" }'
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

## License Summary

This code is made available under the MIT license.

## Security Disclosures

If you would like to report a potential security issue in this project, please do not create a GitHub issue.  Instead, please follow the instructions [here](https://aws.amazon.com/security/vulnerability-reporting/) or [email AWS security directly](mailto:aws-security@amazon.com).
