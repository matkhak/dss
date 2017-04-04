/**
 ***********************************************************************
 * Возвращает список всех показателей
 ***********************************************************************
 *
 * @param Только GET запрос, без параметров
 *
 * @return
 *
 * @author Talipov_MI@surgutneftegas.ru
 *
 */

if ($.request.method === $.net.http.GET) {
    var conn = $.db.getConnection();

    var ps = conn.prepareStatement(
        "SELECT DISTINCT INDCD, SNAME, FNAME, UNIT_NAME " +
        "FROM \"_SYS_BIC\".\"bobj_repo.views/CV_SP_INDICATORS\" "
    );
    let result = ps.executeQuery();

    let out = [];
    while (result.next()) {
        out.push({
            "sInd": result.getNString(1),
            "sShortName": result.getNString(2),
            "sFullName": result.getNString(3),
            "sUnitName": result.getNString(4)
        });
    }

    $.response.setBody(JSON.stringify(out));
    $.response.status = $.net.http.OK;
    $.response.contentType = 'application/json';
}
