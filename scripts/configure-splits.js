const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(filePath)) {
  console.error(`Error: build.gradle not found at ${filePath}`);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

const splitsConfig = `    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86_64"
            universalApk false
        }
    }`;

// Inject after the 'android {' opening block
if (content.includes('splits {')) {
  console.log('Splits configuration already exists in build.gradle.');
} else {
  content = content.replace('android {', `android {\n${splitsConfig}`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully configured ABI splits in build.gradle.');
}
