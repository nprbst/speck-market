/**
 * Release Registry Contracts
 *
 * TypeScript interfaces for upstream/releases.json structure and operations.
 */

/**
 * Transformation status for an upstream release
 */
export enum ReleaseStatus {
  PULLED = "pulled",
  TRANSFORMED = "transformed",
  FAILED = "failed",
}

/**
 * Single upstream release record
 */
export interface UpstreamRelease {
  /** Release version tag (e.g., "v1.0.0") */
  version: string;

  /** Git commit SHA for this release */
  commit: string;

  /** ISO 8601 timestamp when release was pulled */
  pullDate: string;

  /** GitHub URL to release notes */
  releaseNotesUrl: string;

  /** Current transformation status */
  status: ReleaseStatus;

  /** Error message if status is "failed" */
  errorDetails?: string;
}

/**
 * Release registry structure (upstream/releases.json)
 */
export interface ReleaseRegistry {
  /** Version of most recently pulled release */
  latest: string;

  /** All pulled releases (sorted by pullDate descending) */
  releases: UpstreamRelease[];
}

/**
 * Validation error for release registry
 */
export class ReleaseRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseRegistryError";
  }
}

/**
 * Validate UpstreamRelease object
 */
export function validateUpstreamRelease(release: unknown): UpstreamRelease {
  if (typeof release !== "object" || release === null) {
    throw new ReleaseRegistryError("Release must be an object");
  }

  const r = release as Record<string, unknown>;

  // Validate version (semantic versioning pattern)
  if (typeof r.version !== "string" || !/^v\d+\.\d+\.\d+/.test(r.version)) {
    throw new ReleaseRegistryError(
      `Invalid version format: ${r.version} (must match vX.Y.Z)`
    );
  }

  // Validate commit (40 hex characters)
  if (typeof r.commit !== "string" || !/^[0-9a-f]{40}$/.test(r.commit)) {
    throw new ReleaseRegistryError(
      `Invalid commit SHA: ${r.commit} (must be 40 hex chars)`
    );
  }

  // Validate pullDate (ISO 8601)
  if (typeof r.pullDate !== "string" || isNaN(Date.parse(r.pullDate))) {
    throw new ReleaseRegistryError(
      `Invalid pullDate: ${r.pullDate} (must be ISO 8601)`
    );
  }

  // Validate releaseNotesUrl
  if (typeof r.releaseNotesUrl !== "string") {
    throw new ReleaseRegistryError("releaseNotesUrl must be a string");
  }

  // Validate status (enum value)
  if (
    !Object.values(ReleaseStatus).includes(r.status as ReleaseStatus)
  ) {
    throw new ReleaseRegistryError(
      `Invalid status: ${r.status} (must be pulled, transformed, or failed)`
    );
  }

  // Validate errorDetails (required iff status is failed)
  if (r.status === ReleaseStatus.FAILED && typeof r.errorDetails !== "string") {
    throw new ReleaseRegistryError(
      "errorDetails required when status is failed"
    );
  }

  if (r.status !== ReleaseStatus.FAILED && r.errorDetails !== undefined) {
    throw new ReleaseRegistryError(
      "errorDetails must not be present when status is not failed"
    );
  }

  return r as UpstreamRelease;
}

/**
 * Validate ReleaseRegistry object
 */
export function validateReleaseRegistry(registry: unknown): ReleaseRegistry {
  if (typeof registry !== "object" || registry === null) {
    throw new ReleaseRegistryError("Registry must be an object");
  }

  const reg = registry as Record<string, unknown>;

  // Validate latest
  if (typeof reg.latest !== "string") {
    throw new ReleaseRegistryError("latest must be a string");
  }

  // Validate releases array
  if (!Array.isArray(reg.releases)) {
    throw new ReleaseRegistryError("releases must be an array");
  }

  // Validate each release
  const releases = reg.releases.map(validateUpstreamRelease);

  // Check no duplicates
  const versions = new Set(releases.map((r) => r.version));
  if (versions.size !== releases.length) {
    throw new ReleaseRegistryError("Duplicate versions found in releases");
  }

  // Check sorted by pullDate descending
  for (let i = 1; i < releases.length; i++) {
    const prev = new Date(releases[i - 1].pullDate);
    const curr = new Date(releases[i].pullDate);
    if (curr > prev) {
      throw new ReleaseRegistryError(
        "Releases must be sorted by pullDate descending"
      );
    }
  }

  // Check latest matches first release
  if (releases.length > 0 && reg.latest !== releases[0].version) {
    throw new ReleaseRegistryError(
      `latest (${reg.latest}) must match first release version (${releases[0].version})`
    );
  }

  return { latest: reg.latest, releases };
}

/**
 * Create empty release registry
 */
export function createEmptyRegistry(): ReleaseRegistry {
  return {
    latest: "",
    releases: [],
  };
}

/**
 * Add release to registry (updates latest, maintains sort order)
 */
export function addReleaseToRegistry(
  registry: ReleaseRegistry,
  release: UpstreamRelease
): ReleaseRegistry {
  // Check for duplicate version
  if (registry.releases.some((r) => r.version === release.version)) {
    throw new ReleaseRegistryError(
      `Release ${release.version} already exists in registry`
    );
  }

  // Add to beginning (most recent)
  const updatedReleases = [release, ...registry.releases];

  return {
    latest: release.version,
    releases: updatedReleases,
  };
}

/**
 * Update release status in registry
 */
export function updateReleaseStatus(
  registry: ReleaseRegistry,
  version: string,
  status: ReleaseStatus,
  errorDetails?: string
): ReleaseRegistry {
  const releaseIndex = registry.releases.findIndex((r) => r.version === version);

  if (releaseIndex === -1) {
    throw new ReleaseRegistryError(`Release ${version} not found in registry`);
  }

  // Validate errorDetails presence based on status
  if (status === ReleaseStatus.FAILED && !errorDetails) {
    throw new ReleaseRegistryError(
      "errorDetails required when status is failed"
    );
  }

  if (status !== ReleaseStatus.FAILED && errorDetails) {
    throw new ReleaseRegistryError(
      "errorDetails must not be present when status is not failed"
    );
  }

  const updatedReleases = [...registry.releases];
  updatedReleases[releaseIndex] = {
    ...updatedReleases[releaseIndex],
    status,
    errorDetails,
  };

  return {
    ...registry,
    releases: updatedReleases,
  };
}

/**
 * Get release by version
 */
export function getReleaseByVersion(
  registry: ReleaseRegistry,
  version: string
): UpstreamRelease | null {
  return registry.releases.find((r) => r.version === version) || null;
}

/**
 * Get latest release (first in array)
 */
export function getLatestRelease(
  registry: ReleaseRegistry
): UpstreamRelease | null {
  return registry.releases[0] || null;
}
