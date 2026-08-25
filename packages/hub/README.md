# Stamp Hub

## Authorization models

- Some actions require making a request to Stamp Hub with requestUserId param
- Request will be authorized according to the table below based on request user role

### group action

| Action                   | Stamp Admin | Group Owner | Group Member |
| ------------------------ | ----------- | ----------- | ------------ |
| Add members to group     | ○           | ○           |              |
| Remove member from group | ○           | ○           |              |
| Delete group             | ○           | ○           |              |

- All users can create new groups
- Group creator becomes Group Owner

### Catalog action

| Action                            | Stamp Admin | Catalog Owner              | Resource Owner                                           | Resource Approver                                        | ApprovalFlow Approver                                        | General user |
| --------------------------------- | ----------- | -------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | ------------ |
| Assign Catalog Owner              | ○           |                            |                                                          |                                                          |
| Assign Resource Owner             |             | Possible for all resources | Possible only for child resources of the owner resource  |
| Assign Resource Approver          |             | Possible for all resources | Possible only for child resources of the owner resource  |
| Assign ApprovalFlow Approver      |             | ○                          |                                                          |                                                          |
| Assign Resource Requester Groups  |             | Possible for all resources | Possible only for owner resource and its child resources |                                                          |                                                              |
| Set Resource Visibility           |             | Possible for all resources | Possible only for owner resource and its child resources |                                                          |                                                              |
| Create a resource                 |             | Possible for all resources | Possible only for child resources of the owner resource  |
| Create a anyOneCanCreate resource | ○           | ○                          | ○                                                        | ○                                                        | ○                                                            | ○            |
| Delete a resource                 |             | Possible for all resources | Possible only for owner resource and its child resources |                                                          |                                                              |
| Approve Approval Request          |             |                            |                                                          | Possible only for Approval Requests of assigned resource | Possible only for Approval Requests of assigned ApprovalFlow |

- All users can apply for an Approval Request, unless a resource in `inputResources` has `requesterGroupIds` set. In that case only members of at least one of those groups can submit (Catalog Owner / Resource Owner / Approver get no bypass). The membership is re-checked when the request is approved; approving a request whose requester is no longer allowed fails, and the approver can reject it instead.

### Resource access settings

Each resource has two optional, independent settings (set through `resource.updateRequesterGroups` / `resource.updateVisibility`, or on `resource.create`):

| Setting | Default | Effect |
| --- | --- | --- |
| `requesterGroupIds` (up to 10 groups) | anyone can request | Only members of one of the groups can submit an Approval Request that includes the resource (`approvalRequest.submit` returns FORBIDDEN). Re-checked on `approve`. |
| `visibility` (`all` \| `restricted`) | `all` | `restricted` hides the resource from users who are not Catalog Owner, Resource Owner, Resource Approver, a member of `requesterGroupIds`, or Owner of the parent resource: `resource.listOutlines` omits it and `resource.get` / `resource.listAuditItem` return FORBIDDEN. |

Notes:

- Settings are per resource and are not inherited by child resources.
- When an Approval Request is submitted, the hub stores a visibility snapshot on the request (`visibility: { type: "restricted", viewerGroupIds }`) if any input resource — or the target of a `stamp-system/resource-update` request — is `restricted`. `viewerGroupIds` is the union of the owner / approver / requester / parent-owner groups of those resources at submit time. `approvalRequest.get` and `approvalRequest.listByApprovalFlowId` show such a request only to the requester, members of the request's approver group, the Catalog Owner, and members of `viewerGroupIds`. The snapshot is fixed at submit time, so later changes to or deletion of the resource do not change who can see the request; requests submitted while the resource was `all` stay visible.
- `listOutlines` / `listByApprovalFlowId` filter each page after reading it, so a page may contain fewer items than the page size while `paginationToken` is still returned. Clients must keep following the token.
