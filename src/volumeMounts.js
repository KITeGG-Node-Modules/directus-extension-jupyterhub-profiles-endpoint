export const volumeMounts = [
  {
    'name': 'models',
    'mountPath': '/home/jovyan/_shared/models',
    'readOnly': true
  },
  {
    'name': 'notebooks',
    'mountPath': '/home/jovyan/_shared/notebooks',
    'readOnly': true
  },
  {
    'name': 'pip-cache',
    'mountPath': '/shared/caches/pip',
    'readOnly': true
  },
  {
    'name': 'getting-started',
    'mountPath': '/home/jovyan/_Getting Started',
    'readOnly': true
  }
]
