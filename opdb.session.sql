SELECT pfs_visit.pfs_visit_id AS pfs_visit_pfs_visit_id,
  pfs_visit.pfs_visit_description AS pfs_visit_pfs_visit_description,
  pfs_visit.issued_at AS pfs_visit_issued_at,
  EXISTS (
    SELECT 1
    FROM mcs_exposure
    WHERE pfs_visit.pfs_visit_id = mcs_exposure.pfs_visit_id
  ) AS sps_present,
  EXISTS (
    SELECT 1
    FROM sps_visit
    WHERE pfs_visit.pfs_visit_id = sps_visit.pfs_visit_id
  ) AS mcs_present,
  visit_set.visit_set_id AS visit_set_visit_set_id
FROM sps_sequence,
  pfs_visit
  LEFT OUTER JOIN sps_visit ON pfs_visit.pfs_visit_id = sps_visit.pfs_visit_id
  LEFT OUTER JOIN visit_set ON sps_visit.pfs_visit_id = visit_set.pfs_visit_id
WHERE sps_sequence.cmd_str ILIKE '%bias%'
ORDER BY pfs_visit.pfs_visit_id DESC
limit 100