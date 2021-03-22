import { OpReturnType } from "openapi-typescript-fetch"
import { paths } from "~/api/schema"

export type PfsDesignEntry = OpReturnType<paths['/api/pfs_designs']["get"]>[number]
export type PfsDesignDetail = OpReturnType<paths['/api/pfs_designs/{id_hex}']["get"]>
