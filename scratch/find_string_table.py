with open('scratch/index.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's locate the string array and function P
idx = code.find('function P(')
if idx == -1:
    idx = code.find('function vr(')
print("Index:", idx)
print(code[idx-500:idx+500])
