import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const legacyDomain = 'heejun.store'
const canonicalDomain = 'heejun.cloud'

const sourceFiles = [
  'src/index.html',
  'src/components/FullResumePdfTemplate.tsx',
  'src/data/resumeData.ts',
  'web-config-preset.html',
]

const failures = []

for (const relativePath of sourceFiles) {
  const contents = await readFile(resolve(root, relativePath), 'utf8')

  if (contents.includes(legacyDomain)) {
    failures.push(`${relativePath}: contains ${legacyDomain}`)
  }

  if (!contents.includes(canonicalDomain)) {
    failures.push(`${relativePath}: does not contain ${canonicalDomain}`)
  }
}

const builtHtml = await readFile(resolve(root, 'index.html'), 'utf8')
const activeBundleMatch = builtHtml.match(/<script[^>]+src="(\/assets\/index-[^"]+\.js)"/)

if (!activeBundleMatch) {
  failures.push('index.html: active JavaScript bundle could not be resolved')
} else {
  const activeBundlePath = activeBundleMatch[1].replace(/^\//, '')
  const activeBundle = await readFile(resolve(root, activeBundlePath), 'utf8')

  if (activeBundle.includes(legacyDomain)) {
    failures.push(`${activeBundlePath}: contains ${legacyDomain}`)
  }

  if (!activeBundle.includes(canonicalDomain)) {
    failures.push(`${activeBundlePath}: does not contain ${canonicalDomain}`)
  }
}

if (builtHtml.includes(legacyDomain)) {
  failures.push(`index.html: contains ${legacyDomain}`)
}

if (!builtHtml.includes(canonicalDomain)) {
  failures.push(`index.html: does not contain ${canonicalDomain}`)
}

if (failures.length > 0) {
  console.error('Canonical-domain validation failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Canonical-domain validation passed: ${canonicalDomain}`)
}
