# gguser

**gguser** is a CLI tool to easily switch between different Git user profiles. It simplifies managing multiple GitHub or GitLab accounts by allowing users to switch between profiles effortlessly.

## 🚀 Installation

Install `gguser` globally using npm:

```sh
npm install -g gguser
```

## 🎯 Usage

### 1️⃣ **Add a new Git profile**
```sh
gguser add <profile_name> "<full_name>" "<email>" [ssh_key] 
```
Note: ssh_key is optional

Example:
```sh
gguser add work "Shubhendra Chauhan" "work@company" ~/.ssh/id_ed25520
gguser add personal "Shubhendra Singh Chauhan" "personalemail@gmail.com" ~/.ssh/id_ed25520
```

### 2️⃣ **Switch to a Git profile**
```sh
gguser select
```
Or switch directly:
```sh
gguser <profile_name>
```

### 3️⃣ **Show the current Git user**
```sh
gguser now
```

### 4️⃣ **List all profiles**
```sh
gguser list
```

### 5️⃣ **Remove a profile**
```sh
gguser remove <profile_name>
```

### 6️⃣ **Link a profile to a directory**
```sh
gguser link <profile_name>
```
This ensures that whenever you're inside that directory, the correct Git user is applied.

### 7️⃣ **Unlink a directory**
```sh
gguser unlink
```

## 📝 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

## 🎯 Contributing

We welcome contributions from the community! Follow these steps to contribute:

1. **Fork the repository** on GitHub.
2. **Create a feature branch** (`git checkout -b feature-new`)
3. **Commit your changes** (`git commit -m "Added a new feature"`)
4. **Push to GitHub** (`git push origin feature-new`)
5. **Create a Pull Request** 🚀

## 📬 Support
If you find an issue or want a new feature, create an issue [here](https://github.com/withshubh/gguser/issues).

