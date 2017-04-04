/**
 ******************************************************
 *   Возвращает список ответственных сотрудников      *
 ******************************************************
 *
 * @param Только GET запрос, без параметров
 *
 * @return В случае успеха возвращается статус 200
 *
 */

if ($.request.method === $.net.http.GET) {
    var conn = $.db.getConnection();

    var ps = conn.prepareStatement(
        "SELECT ADRP__NAME_LAST || ' ' || ADRP__NAME_FIRST as NAME, USR21__BNAME "+
        "FROM \"_SYS_BIC\".\"sngias.spravochniki.mm/CV_SP_USERS\" " +
        "order by 1"
    );
    var result = ps.executeQuery();

    var out = [];
    while (result.next()) {
        out.push({
            "name": result.getNString(1).trim(),
            "login": result.getNString(2).trim()
        });
    }

    $.response.setBody(JSON.stringify(out));
    $.response.status = $.net.http.OK;
    $.response.contentType = 'application/json';
}
