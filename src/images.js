export const images = [
  {
    'key': 'default',
    'display_name': 'Default Image (Cuda 11.8)',
  },
  {
    'key': 'cuda-11-7',
    'display_name': 'Cuda 11.7',
    'kubespawner_override': {
      'image': 'registry.kitegg.de/library/kitegg-singleuser:cuda-11.7-devel',
    }
  },
  {
    'key': 'cuda-11-6',
    'display_name': 'Cuda 11.6',
    'kubespawner_override': {
      'image': 'registry.kitegg.de/library/kitegg-singleuser:cuda-11.6-devel',
    }
  },
  {
    'key': 'cuda-11-2',
    'display_name': 'Cuda 11.2',
    'kubespawner_override': {
      'image': 'registry.kitegg.de/library/kitegg-singleuser:cuda-11.2-devel',
    }
  },
  {
    'key': 'kitegg-base-image',
    'display_name': 'KITeGG Base Image (Cuda 12.1)',
    'kubespawner_override': {
      'image': 'registry.kitegg.de/library/kitegg-base-image:v1.0-cuda-12.1.0-runtime-ubuntu22.04'
    }
  },
  {
    'key': 'hsm-devel',
    'groups': ['hsm'],
    'display_name': 'HS Mainz Dev (Cuda 11.6)',
    'kubespawner_override': {
      'image': 'registry.kitegg.de/library/kitegg-singleuser:hsm-dev-cuda-11.6-devel'
    }
  },
  {
    'key': 'kisd-auto-kernels',
    'groups': ['kisd'],
    'display_name': 'KISD Auto-Kernels',
    'kubespawner_override': {
      'image': 'registry.kitegg.de/library/kitegg-singleuser:kisd-auto-kernels'
    }
  },
  {
    'key': 'latest',
    'groups': ['management'],
    'display_name': 'KITeGG Base Image (latest)',
    'kubespawner_override': {
      'image': 'registry.kitegg.de/library/kitegg-base-image:latest',
      'init_containers': [{
        'image': 'registry.kitegg.de/library/kitegg-base-image:latest',
        'name': 'kitegg-init-container',
        'command': ['/opt/kitegg-base-image/init-container.sh', '||', 'true']
      }]
    }
  },
]
