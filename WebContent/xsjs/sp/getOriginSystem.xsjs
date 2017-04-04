/**
 * Возвращает список исходных систем
 */


var conn = $.db.getConnection();
var pstmt = conn.prepareStatement(
    "SELECT SCDTLOGCMT__TEXT  || (' | ') || SCDTLOGCMP_EXT__STEXT " +
    "FROM \"_SYS_BIC\".\"bobj_repo.views/CV_SP_SMSY_LOG_COMP\"  " +
    "order by 1"
);
var rs = pstmt.executeQuery();
var data = [];

while (rs.next()) {
    data.push({
        "object": rs.getNString(1)
    });
}

$.response.setBody(JSON.stringify(data));
$.response.contentType = 'application/json';
$.response.status = $.net.http.OK;
