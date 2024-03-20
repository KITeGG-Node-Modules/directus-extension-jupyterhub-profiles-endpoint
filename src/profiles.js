export const profiles = [
  {
    'weight': 0,
    'default': true,
    'display_name': 'No GPU',
    'slug': 'no-gpu',
    'kubespawner_override': {
      'environment': {
        'NVIDIA_VISIBLE_DEVICES': 'none'
      }
    }
  },
  {
    'weight': 10,
    'display_name': 'XS - 1G A100 10GB',
    'slug': 'gpu-xs',
    'kubespawner_override': {
      'extra_resource_limits': {'nvidia.com/mig-1g.10gb': 1},
      'environment': {
        'NVIDIA_DRIVER_CAPABILITIES': 'all'
      }
    }
  },
  {
    'weight': 20,
    'display_name': 'S - 2G A100 20GB',
    'slug': 'gpu-s',
    'kubespawner_override': {
      'extra_resource_limits': {'nvidia.com/mig-2g.20gb': 1},
      'environment': {
        'NVIDIA_DRIVER_CAPABILITIES': 'all'
      }
    }
  },
  {
    'weight': 30,
    'display_name': 'M - 3G A100 40GB',
    'slug': 'gpu-m',
    'kubespawner_override': {
      'extra_resource_limits': {'nvidia.com/mig-3g.40gb': 1},
      'environment': {
        'NVIDIA_DRIVER_CAPABILITIES': 'all'
      }
    }
  },
  {
    'weight': 40,
    'display_name': 'L - A100 80GB',
    'slug': 'gpu-l',
    'kubespawner_override': {
      'extra_resource_limits': {'nvidia.com/gpu': 1},
      'environment': {
        'NVIDIA_DRIVER_CAPABILITIES': 'all'
      }
    }
  },
  {
    'weight': 40,
    'display_name': 'XL - 2x A100 80GB',
    'slug': 'gpu-xl',
    'kubespawner_override': {
      'extra_resource_limits': {'nvidia.com/gpu': 2},
      'environment': {
        'NVIDIA_DRIVER_CAPABILITIES': 'all'
      }
    }
  },
]
