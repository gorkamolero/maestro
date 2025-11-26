import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'path';
import * as fs from 'fs';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/{node-pty,node_modules/node-pty}/**/*',
    },
    // App icon configuration
    icon: path.join(__dirname, 'resources', 'icon'),
    // Include node_modules for native module resolution
    extraResource: [
      path.join(__dirname, 'resources'),
    ],
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      // Copy node-pty native module to the packaged app
      const nodeModulesSource = path.join(__dirname, 'node_modules', 'node-pty');
      const nodeModulesDest = path.join(buildPath, 'node_modules', 'node-pty');

      if (fs.existsSync(nodeModulesSource)) {
        fs.mkdirSync(path.dirname(nodeModulesDest), { recursive: true });
        fs.cpSync(nodeModulesSource, nodeModulesDest, { recursive: true });
        console.log('Copied node-pty to:', nodeModulesDest);
      }
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      // Must be false to allow loading native modules from app.asar.unpacked
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
