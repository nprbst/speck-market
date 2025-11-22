/**
 * Release Registry Manager
 *
 * Manages upstream/releases.json file for tracking pulled spec-kit releases.
 */

import { existsSync } from "fs";
import type {
  ReleaseRegistry,
  UpstreamRelease,
  ReleaseStatus,
} from "../contracts/release-registry";
import {
  validateReleaseRegistry,
  createEmptyRegistry,
  addReleaseToRegistry,
  updateReleaseStatus,
  getReleaseByVersion,
  getLatestRelease,
  ReleaseRegistryError,
} from "../contracts/release-registry";

/**
 * Read release registry from upstream/releases.json
 *
 * @param registryPath - Path to releases.json file
 * @returns Parsed and validated release registry
 * @throws ReleaseRegistryError if file is invalid
 *
 * @example
 * ```typescript
 * const registry = await readRegistry("upstream/releases.json");
 * console.log(`Latest release: ${registry.latest}`);
 * ```
 */
export async function readRegistry(
  registryPath: string
): Promise<ReleaseRegistry> {
  if (!existsSync(registryPath)) {
    // Return empty registry if file doesn't exist
    return createEmptyRegistry();
  }

  try {
    const file = Bun.file(registryPath);
    const data = await file.json() as unknown;
    return validateReleaseRegistry(data);
  } catch (error) {
    if (error instanceof ReleaseRegistryError) {
      throw error;
    }
    throw new ReleaseRegistryError(
      `Failed to read registry: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Write release registry to upstream/releases.json
 *
 * @param registryPath - Path to releases.json file
 * @param registry - Release registry to write
 *
 * @example
 * ```typescript
 * const registry = createEmptyRegistry();
 * await writeRegistry("upstream/releases.json", registry);
 * ```
 */
export async function writeRegistry(
  registryPath: string,
  registry: ReleaseRegistry
): Promise<void> {
  try {
    // Validate before writing
    validateReleaseRegistry(registry);

    const json = JSON.stringify(registry, null, 2);
    await Bun.write(registryPath, json);
  } catch (error) {
    if (error instanceof ReleaseRegistryError) {
      throw error;
    }
    throw new ReleaseRegistryError(
      `Failed to write registry: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Add a new release to the registry
 *
 * @param registryPath - Path to releases.json file
 * @param release - Release to add
 * @returns Updated registry
 *
 * @example
 * ```typescript
 * const release: UpstreamRelease = {
 *   version: "v1.0.0",
 *   commit: "abc123...",
 *   pullDate: new Date().toISOString(),
 *   releaseNotesUrl: "https://github.com/...",
 *   status: ReleaseStatus.PULLED,
 * };
 * await addRelease("upstream/releases.json", release);
 * ```
 */
export async function addRelease(
  registryPath: string,
  release: UpstreamRelease
): Promise<ReleaseRegistry> {
  const registry = await readRegistry(registryPath);
  const updated = addReleaseToRegistry(registry, release);
  await writeRegistry(registryPath, updated);
  return updated;
}

/**
 * Update the status of an existing release
 *
 * @param registryPath - Path to releases.json file
 * @param version - Version to update
 * @param status - New status
 * @param errorDetails - Error details (required if status is "failed")
 * @returns Updated registry
 *
 * @example
 * ```typescript
 * await updateStatus(
 *   "upstream/releases.json",
 *   "v1.0.0",
 *   ReleaseStatus.TRANSFORMED
 * );
 * ```
 */
export async function updateStatus(
  registryPath: string,
  version: string,
  status: ReleaseStatus,
  errorDetails?: string
): Promise<ReleaseRegistry> {
  const registry = await readRegistry(registryPath);
  const updated = updateReleaseStatus(registry, version, status, errorDetails);
  await writeRegistry(registryPath, updated);
  return updated;
}

/**
 * Get release by version
 *
 * @param registryPath - Path to releases.json file
 * @param version - Version to lookup
 * @returns Release if found, null otherwise
 */
export async function getRelease(
  registryPath: string,
  version: string
): Promise<UpstreamRelease | null> {
  const registry = await readRegistry(registryPath);
  return getReleaseByVersion(registry, version);
}

/**
 * Get the latest release
 *
 * @param registryPath - Path to releases.json file
 * @returns Latest release if any exist, null otherwise
 */
export async function getLatest(
  registryPath: string
): Promise<UpstreamRelease | null> {
  const registry = await readRegistry(registryPath);
  return getLatestRelease(registry);
}

/**
 * Check if a release version already exists
 *
 * @param registryPath - Path to releases.json file
 * @param version - Version to check
 * @returns true if release exists, false otherwise
 */
export async function releaseExists(
  registryPath: string,
  version: string
): Promise<boolean> {
  const release = await getRelease(registryPath, version);
  return release !== null;
}
