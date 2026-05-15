const LABELS = {
  pending:            'Pending',
  accepted:           'Accepted',
  rejected:           'Declined',
  withdrawn:          'Withdrawn',
  expired:            'Expired',
  active:             'Active',
  awaiting_start:     'Awaiting start',
  in_progress:        'In progress',
  delivered:          'Delivered',
  revision_requested: 'Revision needed',
  in_dispute:         'In dispute',
  completed:          'Completed',
  cancelled:          'Cancelled',
  open:               'Open',
  closed:             'Closed',
  banned:             'Banned',
  suspended:          'Suspended',
};

const StatusPill = ({ status }) => (
  <span className={`status ${status}`}>{LABELS[status] || status}</span>
);

export default StatusPill;
