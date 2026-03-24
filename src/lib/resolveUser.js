/**
 * Resolves the "active" user for an API call.
 * - If no X-Child-Id header → returns the authenticated parent
 * - If X-Child-Id header → verifies child belongs to parent → returns child with parent's tier
 *
 * @returns { user, parent } on success, or { error, status } on failure
 */
export async function resolveActiveUser(supabase, google_id, request) {
  const { data: parent } = await supabase
    .from('users').select('*').eq('google_id', google_id).single()
  if (!parent) return { error: 'User not found', status: 401 }

  const childId = request.headers.get('x-child-id')
  if (!childId) return { user: parent, parent }

  const { data: child } = await supabase
    .from('users').select('*').eq('id', childId).eq('parent_id', parent.id).single()
  if (!child) return { error: 'Child not found or access denied', status: 403 }

  // Child inherits parent's tier so limits/features apply correctly
  return { user: { ...child, tier: parent.tier }, parent }
}
