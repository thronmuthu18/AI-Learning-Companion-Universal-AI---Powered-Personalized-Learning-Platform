const { withXcodeProject, withAndroidManifest } = require('expo/config-plugins');

const EXECUTORCH_SPM_PRODUCTS = ['executorch', 'executorch_llm', 'backend_xnnpack'];

/**
 * Expo Config Plugin wiring ExecuTorch Swift Package Manager targets on iOS
 * and largeHeap on Android during `expo prebuild`.
 */
module.exports = function withExecuTorchNative(config) {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app && app.$) {
      app.$['android:largeHeap'] = 'true';
    }
    return mod;
  });

  config = withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const repoUrl = 'https://github.com/pytorch/executorch';
    const rootObjects = project.hash.project.objects;
    rootObjects.XCRemoteSwiftPackageReference = rootObjects.XCRemoteSwiftPackageReference || {};
    rootObjects.XCSwiftPackageProductDependency =
      rootObjects.XCSwiftPackageProductDependency || {};

    const pkgRefUuid = project.generateUuid();
    rootObjects.XCRemoteSwiftPackageReference[pkgRefUuid] = {
      isa: 'XCRemoteSwiftPackageReference',
      repositoryURL: `"${repoUrl}"`,
      requirement: {
        kind: 'upToNextMajorVersion',
        minimumVersion: '1.5.0',
      },
    };

    const projKey = project.getFirstProject().uuid;
    const pbxProj = rootObjects.PBXProject[projKey];
    pbxProj.packageReferences = pbxProj.packageReferences || [];
    pbxProj.packageReferences.push({
      value: pkgRefUuid,
      comment: 'XCRemoteSwiftPackageReference "executorch"',
    });

    // Attach ExecuTorch SPM product dependencies to the primary application target
    const targetUuid = project.getFirstTarget().uuid;
    const nativeTarget = rootObjects.PBXNativeTarget[targetUuid];
    if (nativeTarget) {
      nativeTarget.packageProductDependencies = nativeTarget.packageProductDependencies || [];
      for (const productName of EXECUTORCH_SPM_PRODUCTS) {
        const depUuid = project.generateUuid();
        rootObjects.XCSwiftPackageProductDependency[depUuid] = {
          isa: 'XCSwiftPackageProductDependency',
          package: pkgRefUuid,
          package_comment: 'XCRemoteSwiftPackageReference "executorch"',
          productName,
        };
        nativeTarget.packageProductDependencies.push({
          value: depUuid,
          comment: productName,
        });
      }
    }

    return mod;
  });

  return config;
};
