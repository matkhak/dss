/**
 *************************************************************
 * Возвращает список атрибутов для указанного Бизнес-Объекта *
 *************************************************************
 *
 * @param Только GET запрос
 *
 * @return
 *
 * @author Talipov_MI@surgutneftegas.ru
 *
 */

if ($.request.method === $.net.http.GET) {
    let conn = $.db.getConnection();

    let iId = parseInt($.request.parameters.get("id"));
    let iVersion = parseInt($.request.parameters.get("version"));

    let ps = conn.prepareStatement(
        "select ID_ATTRIBUTE, NAME " +
        "from \"Z_BOBJ_REPO\".\"T_ATTRIBUTE\" " +
        "where id_card = ? " +
        "and version = ?"
    );
    ps.setBigInt(1, iId);
    ps.setInteger(2, iVersion);
    let result = ps.executeQuery();

    let out = [];
    while (result.next()) {
        out.push({
            "iId": result.getInteger(1),
            "sName": result.getNString(2)
        });
    }

    $.response.setBody(JSON.stringify(out));
    $.response.status = $.net.http.OK;
    $.response.contentType = 'application/json';
}
