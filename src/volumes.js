export const volumes = [
  {
    'name': 'models',
    'persistentVolumeClaim': {
      'claimName': 'shared-models'
    }
  },
  {
    'name': 'notebooks',
    'persistentVolumeClaim': {
      'claimName': 'shared-notebooks'
    }
  },
  {
    'name': 'pip-cache',
    'persistentVolumeClaim': {
      'claimName': 'shared-cache-pip'
    }
  },
  {
    'name': 'getting-started',
    'persistentVolumeClaim': {
      'claimName': 'shared-getting-started-notebooks'
    }
  }
]
