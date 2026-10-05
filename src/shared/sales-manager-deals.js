'use strict';

/* The server and browser intentionally consume the same canonical opportunity
   projection. A repeated SQL/auth/client row for one base_id is one deal; a
   different base_id remains a separate opportunity even when labels match. */
module.exports=require('../../public/sales-manager-opportunity-authority');
