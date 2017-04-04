/**
 ************************
 * Возвращает список БО *
 ************************
 *
 * @param Только GET запроc
 * Если запрос приходит без параметров, то возвращаются все БО
 * Если есть параметр imCode (code_value инфо-модели), тогда БО будут возвращены только для этой ИМ
 *
 * @author Talipov_MI@surgutneftegas.ru
 *
 * модернизирован выход, дополнен количеством полей.
 *
 * @author domozhakov_mv@surgutneftegas.ru

 */

if ($.request.method === $.net.http.GET) {
    var conn = $.db.getConnection();

    if ($.request.parameters.get("imCode")) {
        var sImCode = $.request.parameters.get("imCode");
    }

    let ps;

    if (sImCode !== undefined) {
        ps = conn.prepareStatement(
            "SELECT ID_CARD, VERSION, NAME_CARD," +
            " AUTHOR, CREATION_DATE, IAS_NAME " +
            "FROM \"_SYS_BIC\".\"bobj_repo.views/CV_CARD_DATA\" " +
            "WHERE ias_code_value = ? " +
            "AND IS_ACTIVE = true"
        );
        ps.setNString(1, sImCode);
    } else {
        ps = conn.prepareStatement(
            "SELECT ID_CARD, VERSION, NAME_CARD NAME, " +
            " AUTHOR, CREATION_DATE, IAS_NAME " +
            "FROM \"_SYS_BIC\".\"bobj_repo.views/CV_CARD_DATA\" " +
            "WHERE IS_ACTIVE = true"
        );
    }
    let result = ps.executeQuery();

    let out = [];
    while (result.next()) {
        out.push({
            "iId": result.getInteger(1),
            "iVersion": result.getInteger(2),
            "sName": result.getNString(3),
            "sAuthor": result.getNString(4),
            "sDate": result.getNString(5).substring(0, 19),
            "sImName": result.getNString(6),
            "sType": 'card'



        });
    }

    $.response.setBody(JSON.stringify(out));
    $.response.status = $.net.http.OK;
    $.response.contentType = 'application/json';
}
