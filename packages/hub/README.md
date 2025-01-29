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
| Create a resource                 |             | Possible for all resources | Possible only for child resources of the owner resource  |
| Create a anyOneCanCreate resource | ○           | ○                          | ○                                                        | ○                                                        | ○                                                            | ○            |
| Delete a resource                 |             | Possible for all resources | Possible only for owner resource and its child resources |                                                          |                                                              |
| Approve Approval Request          |             |                            |                                                          | Possible only for Approval Requests of assigned resource | Possible only for Approval Requests of assigned ApprovalFlow |

- All users can apply for an Approval Request
