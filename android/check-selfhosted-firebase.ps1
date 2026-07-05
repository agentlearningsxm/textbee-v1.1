param(
    [switch]$SkipGradle
)

$ErrorActionPreference = "Stop"

$androidDir = $PSScriptRoot
$appDir = Join-Path $androidDir "app"
$gradle = Join-Path $androidDir "gradlew.bat"

if (-not (Test-Path (Join-Path $appDir "build.gradle"))) {
    throw "Expected Android app module at $appDir"
}

if (-not $SkipGradle) {
    Push-Location $androidDir
    try {
        & $gradle ":app:processSelfhostedDebugMainManifest" ":app:processSelfhostedDebugGoogleServices" "--no-daemon"
        $gradleExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    if ($gradleExitCode -ne 0) {
        exit $gradleExitCode
    }
}

$manifestCandidates = @(
    (Join-Path $appDir "build\intermediates\merged_manifest\selfhostedDebug\AndroidManifest.xml"),
    (Join-Path $appDir "build\intermediates\merged_manifests\selfhostedDebug\AndroidManifest.xml")
)
$manifestPath = $manifestCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $manifestPath) {
    throw "Selfhosted merged manifest not found. Run Gradle manifest processing first."
}

$failures = New-Object System.Collections.Generic.List[string]
$manifestText = Get-Content -Raw $manifestPath
$hasFirebaseProvider = $manifestText -match "com\.google\.firebase\.provider\.FirebaseInitProvider"
if ($hasFirebaseProvider) {
    $failures.Add("Selfhosted merged manifest still contains FirebaseInitProvider: $manifestPath")
}

$valuesPath = Join-Path $appDir "build\generated\res\processSelfhostedDebugGoogleServices\values\values.xml"
$hasPlaceholderKey = $false
if (Test-Path $valuesPath) {
    $valuesText = Get-Content -Raw $valuesPath
    $hasPlaceholderKey = $valuesText -match "placeholder-selfhosted-build-only"
}

$sourceRoot = Join-Path $appDir "src"
$directFirebasePatterns = @(
    "FirebaseMessaging\s*\.\s*getInstance\s*\(",
    "FirebaseCrashlytics\s*\.\s*getInstance\s*\(",
    "FirebaseApp\s*\.\s*(initializeApp|getInstance)\s*\(",
    "\bFirebase\s*\.\s*(messaging|crashlytics)\b",
    "import\s+com\.google\.firebase\.ktx\.Firebase\b",
    "import\s+com\.google\.firebase\.(messaging|crashlytics)\.ktx\.(messaging|crashlytics)\b"
)
$excludedSourcePathPattern = "\\(build|generated|intermediates|outputs|tmp)\\"
$directFirebaseCalls = @()
if (Test-Path $sourceRoot) {
    $sourceFiles = Get-ChildItem -Path $sourceRoot -Recurse -File |
        Where-Object {
            $_.Extension -in @(".java", ".kt", ".kts") -and
            $_.Name -ine "SafeFirebase.java" -and
            $_.FullName -notmatch $excludedSourcePathPattern
        }

    $directFirebaseCalls = @($sourceFiles | Select-String -Pattern $directFirebasePatterns -CaseSensitive)
}

if ($directFirebaseCalls.Count -gt 0) {
    $locations = $directFirebaseCalls | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
    $failures.Add("Direct Firebase access outside SafeFirebase.java:`n$($locations -join "`n")")
}

if ($failures.Count -gt 0) {
    if ($hasPlaceholderKey) {
        Write-Host "Selfhosted placeholder Firebase resources generated at $valuesPath"
    }
    Write-Error ($failures -join "`n")
    exit 1
}

if ($hasPlaceholderKey) {
    Write-Host "Selfhosted placeholder Firebase resources are present, but FirebaseInitProvider is absent and direct calls are guarded."
} else {
    Write-Host "Selfhosted placeholder Firebase resources are absent."
}
Write-Host "Selfhosted Firebase static check passed."
