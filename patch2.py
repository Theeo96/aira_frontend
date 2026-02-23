import os

file_path = 'App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if "setAppState(AppState.HOME);" in line and "setIsOnboarding(false);" in lines[i-1]:
        lines[i] = "    if (!userToken) {\n      setAppState(AppState.LOGIN);\n    } else {\n      setAppState(AppState.HOME);\n    }"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print("Patched startHome using flexible replacement!")
        break
