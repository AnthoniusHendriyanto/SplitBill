import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import Icon from '../components/Icon';
import useBillStore from '../store/useBillStore';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { cn } from '../utils/cn';

const splitOptions = [['equal', 'Equal'], ['shared_items', 'By item'], ['percentage', 'Percentage'], ['custom', 'Custom']];
const tabs = [
  ['bills', 'Bills'],
  ['balances', 'Balances'],
  ['members', 'Members'],
  ['settings', 'Settings'],
];

const formatMoney = value => `Rp ${Math.abs(Number(value) || 0).toLocaleString('id-ID')}`;

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [availableBills, setAvailableBills] = useState([]);
  const [activeTab, setActiveTab] = useState('bills');
  const [defaultSplit, setDefaultSplit] = useState('equal');
  const [defaultLoaded, setDefaultLoaded] = useState(false);
  const [name, setName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [busy, setBusy] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getGroups();
      setGroups(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load groups.');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.getGroups()
      .then(data => { if (active) { setGroups(Array.isArray(data) ? data : []); setError(''); } })
      .catch(err => { if (active) setError(err.message || 'Could not load groups.'); })
      .finally(() => { if (active) setLoadingGroups(false); });
    return () => { active = false; };
  }, []);

  const refreshSelected = useCallback(async id => {
    const group = await api.getGroup(id);
    setSelected(group);
    return group;
  }, []);

  const open = async id => {
    setLoadingGroup(true);
    setError('');
    setNotice('');
    try {
      const [group, bills] = await Promise.all([api.getGroup(id), api.getBills(1, 100)]);
      setSelected(group);
      setAvailableBills(bills?.data || bills || []);
      setActiveTab('bills');
      setDefaultSplit('equal');
      setDefaultLoaded(false);
    } catch (err) {
      setError(err.message || 'Could not open this group.');
    } finally {
      setLoadingGroup(false);
    }
  };

  const selectTab = async tab => {
    setActiveTab(tab);
    if (tab !== 'settings' || defaultLoaded || !selected?.group?.id) return;
    setDefaultLoaded(true);
    try {
      const split = await api.getGroupDefaultSplit(selected.group.id);
      setDefaultSplit(split?.split_type || 'equal');
    } catch {
      setDefaultSplit('equal');
    }
  };

  const create = async event => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy('create');
    setError('');
    try {
      await api.createGroup(name.trim());
      setName('');
      setNotice('Group created.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not create group.');
    } finally {
      setBusy('');
    }
  };

  const useGroup = () => {
    if (!selected?.group?.id) return;
    useBillStore.getState().resetBill();
    useBillStore.getState().updateBill({ groupId: selected.group.id });
    useBillStore.getState().updateUI({ activeTab: 'bills', step: 1 });
  };

  const saveDefault = async event => {
    event.preventDefault();
    setBusy('default');
    setError('');
    try {
      await api.setGroupDefaultSplit(selected.group.id, { split_type: defaultSplit, configuration: {} });
      setDefaultLoaded(true);
      setNotice('Default split saved.');
    } catch (err) {
      setError(err.message || 'Could not save the default split.');
    } finally {
      setBusy('');
    }
  };

  const addMember = async event => {
    event.preventDefault();
    if (!memberName.trim()) return;
    setBusy('member');
    setError('');
    try {
      await api.addGroupMember(selected.group.id, {
        display_name: memberName.trim(),
        ...(memberUserId.trim() ? { user_id: memberUserId.trim() } : {}),
      });
      setMemberName('');
      setMemberUserId('');
      setNotice('Member added.');
      await refreshSelected(selected.group.id);
    } catch (err) {
      setError(err.message || 'Could not add this member.');
    } finally {
      setBusy('');
    }
  };

  const removeMember = async memberId => {
    setBusy(`remove-${memberId}`);
    setError('');
    try {
      await api.removeGroupMember(selected.group.id, memberId);
      await refreshSelected(selected.group.id);
      setNotice('Member removed.');
    } catch (err) {
      setError(err.message || 'Could not remove this member.');
    } finally {
      setBusy('');
    }
  };

  const attachBill = async billId => {
    setBusy(`attach-${billId}`);
    setError('');
    try {
      const detail = await api.getBill(billId);
      const bill = detail.bill || detail;
      const members = selected.group.members.flatMap(member => member.user_id
        ? (bill.persons || []).filter(person => person.user_id === member.user_id).map(person => ({ group_member_id: member.id, person_id: person.id }))
        : []);
      await api.attachBillToGroup(selected.group.id, billId, members);
      await refreshSelected(selected.group.id);
      setNotice('Bill attached to this group.');
    } catch (err) {
      setError(err.message || 'Could not attach this bill.');
    } finally {
      setBusy('');
    }
  };

  const deleteGroup = async () => {
    setBusy('delete');
    setError('');
    try {
      await api.deleteGroup(selected.group.id);
      setDeleteOpen(false);
      setSelected(null);
      await load();
      setNotice('Group deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete this group.');
    } finally {
      setBusy('');
    }
  };

  const attachable = useMemo(
    () => availableBills.filter(bill => !(selected?.bills || []).some(attached => attached.id === bill.id)),
    [availableBills, selected]
  );

  if (loadingGroup) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="page-content page-stack">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-36 animate-pulse rounded-2xl bg-surface-raised" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-28 animate-pulse rounded-2xl bg-surface-raised" />
            <div className="h-28 animate-pulse rounded-2xl bg-surface-raised" />
          </div>
        </div>
      </div>
    );
  }

  if (selected) {
    const group = selected.group;
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="page-content page-stack">
          <button type="button" onClick={() => { setSelected(null); setError(''); setNotice(''); }} className="btn-ghost self-start">
            <Icon name="arrow_back" />All groups
          </button>

          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">Shared space</p>
              <h1 className="page-title break-words">{group.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="chip"><Icon name="group" className="text-base" />{group.members?.length || 0} {(group.members?.length || 0) === 1 ? 'member' : 'members'}</span>
                <span className="chip"><Icon name="receipt_long" className="text-base" />{selected.bills?.length || 0} {(selected.bills?.length || 0) === 1 ? 'bill' : 'bills'}</span>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={useGroup}><Icon name="add" />New split with group</button>
          </header>

          {error && <p role="alert" className="inline-error"><Icon name="error_outline" className="text-lg" />{error}</p>}
          {notice && <p role="status" className="inline-success"><Icon name="check_circle" className="text-lg" />{notice}</p>}

          <div className="segmented" role="tablist" aria-label="Group sections">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => selectTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'bills' && (
            <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
              <section className="panel p-5 sm:p-6">
                <div className="section-heading">
                  <div><h2>Bills</h2><p>Everything attached to this group.</p></div>
                  <StatusBadge tone="neutral">{selected.bills?.length || 0}</StatusBadge>
                </div>
                {!selected.bills?.length ? (
                  <EmptyState icon="receipt_long" title="No bills here yet" description="Attach an existing bill or start a new split with this group." />
                ) : (
                  <div>
                    {selected.bills.map(bill => (
                      <div key={bill.id} className="data-row">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-secondary"><Icon name="receipt_long" className="text-lg" /></span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{bill.title || 'Untitled bill'}</p>
                            <p className="mt-0.5 text-xs text-secondary">{bill.bill_date || 'No date'}{bill.status ? ` · ${bill.status}` : ''}</p>
                          </div>
                        </div>
                        <strong className="font-numeric text-sm">{formatMoney(bill.grand_total ?? bill.grandTotal)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel p-5 sm:p-6">
                <div className="section-heading">
                  <div><h2>Attach a bill</h2><p>Linked participants are mapped automatically.</p></div>
                </div>
                {!attachable.length ? (
                  <p className="text-sm text-secondary">Every loaded bill is already in this group.</p>
                ) : (
                  <div>
                    {attachable.slice(0, 10).map(bill => (
                      <div key={bill.id} className="data-row">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{bill.title || 'Untitled bill'}</p>
                          <p className="mt-0.5 text-xs text-secondary">{bill.bill_date || 'No date'}</p>
                        </div>
                        <button type="button" className="btn-ghost" disabled={busy === `attach-${bill.id}`} onClick={() => attachBill(bill.id)}>
                          {busy === `attach-${bill.id}` ? 'Attaching…' : 'Attach'}<Icon name="add_link" className="text-base" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-xs leading-relaxed text-tertiary">Unlinked participant names stay bill-scoped. No account identifiers appear in public share links.</p>
              </section>
            </div>
          )}

          {activeTab === 'balances' && (
            <section className="panel p-5 sm:p-6">
              <div className="section-heading">
                <div><h2>Balances</h2><p>Net position across the group’s bills.</p></div>
              </div>
              {!selected.balances?.length ? (
                <EmptyState icon="account_balance" title="No balances yet" description="Attach a bill with participants to see group balances." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {selected.balances.map(balance => {
                    const net = Number(balance.net) || 0;
                    return (
                      <article key={balance.member_id} className="panel-muted p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary font-bold text-[#151714]">{(balance.display_name || '?').charAt(0).toUpperCase()}</span>
                          <div className="min-w-0"><p className="truncate font-bold">{balance.display_name}</p><p className="text-xs text-secondary">{net === 0 ? 'Settled up' : net > 0 ? 'Owed to them' : 'They owe'}</p></div>
                        </div>
                        <p className={cn('mt-5 font-numeric text-2xl font-extrabold tracking-tight', net > 0 ? 'text-[--semantic-success]' : net < 0 ? 'text-[--semantic-error]' : 'text-primary')}>
                          {net < 0 ? '− ' : ''}{formatMoney(net)}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'members' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <section className="panel p-5 sm:p-6">
                <div className="section-heading"><div><h2>Add member</h2><p>Add a name, or link an existing user ID.</p></div></div>
                <form onSubmit={addMember} className="space-y-4">
                  <div>
                    <label htmlFor="group-member-name" className="field-label">Display name</label>
                    <input id="group-member-name" value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="e.g. Ari" className="field-input" required />
                  </div>
                  <div>
                    <label htmlFor="group-member-user" className="field-label">Linked user ID <span className="font-normal text-tertiary">(optional)</span></label>
                    <input id="group-member-user" value={memberUserId} onChange={e => setMemberUserId(e.target.value)} placeholder="User UUID" className="field-input" autoComplete="off" />
                    <p className="field-hint">Linked members receive in-app assignments. Leave blank for name-only participants.</p>
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={busy === 'member'}>{busy === 'member' ? 'Adding…' : 'Add member'}</button>
                </form>
              </section>

              <section className="panel p-5 sm:p-6">
                <div className="section-heading"><div><h2>Members</h2><p>People who share this group.</p></div><StatusBadge tone="brand">{group.members?.length || 0}</StatusBadge></div>
                {!group.members?.length ? <EmptyState icon="group" title="No members" description="Add the first person to this group." /> : (
                  <div>
                    {group.members.map(member => (
                      <div key={member.id} className="data-row">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised font-bold">{(member.display_name || '?').charAt(0).toUpperCase()}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{member.display_name}</p>
                            <p className="text-xs capitalize text-secondary">{member.role}{member.user_id ? ' · linked account' : ' · name only'}</p>
                          </div>
                        </div>
                        {member.role !== 'owner' && (
                          <button type="button" className="btn-ghost text-[--semantic-error]" disabled={busy === `remove-${member.id}`} onClick={() => removeMember(member.id)}>
                            {busy === `remove-${member.id}` ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="panel p-5 sm:p-6">
                <div className="section-heading"><div><h2>Default split</h2><p>Applied when you start a bill from this group.</p></div></div>
                <form onSubmit={saveDefault} className="space-y-4">
                  <div>
                    <label htmlFor="group-default-split" className="field-label">Split method</label>
                    <select id="group-default-split" value={defaultSplit} onChange={e => setDefaultSplit(e.target.value)} className="field-input">
                      {splitOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <p className="field-hint">Percentage and custom splits require a Pro account.</p>
                  </div>
                  <button type="submit" className="btn-primary" disabled={busy === 'default'}>{busy === 'default' ? 'Saving…' : 'Save default'}</button>
                </form>
              </section>

              <section className="panel border-[--semantic-error]/30 p-5 sm:p-6">
                <div className="section-heading"><div><h2 className="text-[--semantic-error]">Delete group</h2><p>Bills stay in your history; the group and its mappings are removed.</p></div></div>
                <button type="button" className="btn-danger" onClick={() => setDeleteOpen(true)}><Icon name="delete" />Delete group</button>
              </section>
            </div>
          )}

          <ConfirmDialog
            open={deleteOpen}
            title="Delete this group?"
            message="The group and its member mappings will be removed. Bills in your history remain available."
            confirmLabel="Delete group"
            variant="danger"
            onConfirm={deleteGroup}
            onCancel={() => setDeleteOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-content page-stack">
        <PageHeader
          eyebrow="Shared spaces"
          title="Groups"
          description="Keep trips, households, and recurring crews in one place."
          actions={<span className="chip"><Icon name="groups" className="text-base" />{groups.length} {groups.length === 1 ? 'group' : 'groups'}</span>}
        />

        {error && <p role="alert" className="inline-error"><Icon name="error_outline" className="text-lg" />{error}</p>}
        {notice && <p role="status" className="inline-success"><Icon name="check_circle" className="text-lg" />{notice}</p>}

        <form onSubmit={create} className="section-card">
          <div className="section-heading"><div><h2>Create a group</h2><p>Give the shared space a name.</p></div></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label htmlFor="group-name" className="field-label">Group name</label>
              <input id="group-name" value={name} onChange={e => setName(e.target.value)} placeholder="Bali trip, Apartment, Team lunch…" className="field-input" required />
            </div>
            <button type="submit" className="btn-primary sm:self-end" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create group'}<Icon name="add" /></button>
          </div>
        </form>

        {loadingGroups ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading groups">
            {[1, 2, 3].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-surface-raised" />)}
          </div>
        ) : !groups.length ? (
          <div className="panel">
            <EmptyState icon="groups" title="Create your first group" description="Groups keep several shared bills together and make repeat splits faster." />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map(group => (
              <button
                key={group.id}
                type="button"
                onClick={() => open(group.id)}
                className="group flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-surface-elevated p-5 text-left transition-colors hover:border-[--border-strong] hover:bg-surface-raised"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary text-lg font-extrabold text-[#151714]">{(group.name || '?').charAt(0).toUpperCase()}</span>
                  <Icon name="arrow_outward" className="text-lg text-tertiary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <div className="mt-5">
                  <p className="truncate font-bold">{group.name}</p>
                  <p className="mt-1 text-sm text-secondary">{group.members?.length || 0} {(group.members?.length || 0) === 1 ? 'member' : 'members'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
