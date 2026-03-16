
import os,sys
def main():\n    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')\n    from django.core.management import execute_from_command_line\n    execute_from_command_line(sys.argv)\nif __name__ == '__main__':
    main()
