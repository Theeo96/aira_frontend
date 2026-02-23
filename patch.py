import os

file_path = 'src/pages/HistoryPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('if (!token) throw new Error("No token found");', 'if (!useMockData && !token) throw new Error("No token found");')
content = content.replace('encodeURIComponent(token)', 'encodeURIComponent(token || "")')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully!')
