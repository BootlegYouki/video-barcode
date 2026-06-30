const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

        // Add use_modular_headers! at the top if not already present
        if (!podfileContent.includes('use_modular_headers!')) {
          podfileContent = `use_modular_headers!\n\n${podfileContent}`;
          fs.writeFileSync(podfilePath, podfileContent, 'utf-8');
        }
      }
      return config;
    },
  ]);
};
