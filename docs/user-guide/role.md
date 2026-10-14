# Roles and Permissions

This document explains the various roles within Stamp and their respective permissions.

### Stamp Admin

The administrator of Stamp. Can assign Catalog Owners to the Catalog.

### Catalog Owner

A person who can freely create Resources in each Catalog, and assign Resource Owners, Resource Approvers, and Approval Flow Approvers. Instead of directly assigning users as Catalog Owners, user groups are assigned, and users are managed by adding them to the group.

### Resource Owner

Owners of each Resource managed by Stamp. Can modify the settings of the resources they own and create child Resources. Instead of directly assigning users as Resource Owners, user groups are assigned, and users are managed by adding them to the group.

### Resource Approver

Approvers for each Resource. If the Approver type of the Approval Flow in the Stamp Catalog is specified as Resource, they can be set. Instead of directly assigning users as Approvers, user groups are assigned, and users are managed by adding them to the group.

### ApprovalFlow Approver

Approvers for each Approval Flow. If the Approver type of the Approval Flow in the Stamp Catalog is specified as ApprovalFlow, they can be set. Instead of directly assigning users as Approvers, user groups are assigned, and users are managed by adding them to the group.

### Resource Requester

Optional per-resource setting. If one or more user groups are assigned as Requester groups of a Resource, only members of those groups can submit Approval Requests that include the Resource. If no group is assigned, anyone can request (default). Catalog Owners, Resource Owners and Parent Resource Owners can assign Requester groups. The check is repeated when a request is approved, so a request from a user who has since been removed from the groups cannot be approved.

### Resource Visibility

Optional per-resource setting, independent of Requester groups. A Resource with visibility `restricted` is only visible to the Catalog Owner, the Resource Owner, the Resource Approver, members of its Requester groups and the Owner of its parent Resource; everyone else does not see it in resource lists, cannot open it and cannot view its audit items. Approval Requests that include a restricted Resource are likewise only visible to the requester, the approver group, the Catalog Owner and those groups (as they were when the request was submitted). The default visibility is `all`.
