/**
 ******************************************************
 *        Возвращает список всех ИТ-решений           *
 ******************************************************
 *
 * @param Только GET запрос, без параметров
 *
 * @return В случае успеха возвращается массив объектов вида:
    {
        "code": "X",
        "name": "Y"
    }
 *
 * @author Talipov_MI@surgutneftegas.ru
 *
 */

if ($.request.method === $.net.http.GET) {
    var conn = $.db.getConnection();

    var ps = conn.prepareStatement(
        "select __KOD_IT, ZKOD_IT__NAME " +
        "from \"_SYS_BIC\".\"bobj_repo.views/CV_SP_ZKOD_IT\" " +
        "order by __KOD_IT"
    );
    var result = ps.executeQuery();

    var out = [];
    while (result.next()) {
        out.push({
            "code": result.getNString(1),
            "name": result.getNString(2)
        });
    }

    $.response.setBody(JSON.stringify(out));
    $.response.status = $.net.http.OK;
    $.response.contentType = 'application/json';
}
